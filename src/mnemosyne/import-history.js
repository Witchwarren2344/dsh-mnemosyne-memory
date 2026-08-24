/**
 * Mnemosyne Import History - 跨会话回溯导入
 * 
 * 功能：
 * - 扫描 ~/.dsh/sessions 下的历史会话日志
 * - 解析 JSONL/Zstd 格式提取用户/助手轮次
 * - 对新记忆做去重后导入当前 workspace bank
 * - 返回导入统计
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createReadStream } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const DSH_SESSIONS_ROOT = process.env.HOME ? join(process.env.HOME, '.dsh', 'sessions') : '~/.dsh/sessions';

/**
 * 解压 zstd 文件并返回 JSONL 字符串
 */
function decompressZstd(filePath) {
  try {
    // 使用系统 zstd 命令解压到临时文件
    const tmpFile = `/tmp/mnemosyne_import_${Date.now()}.jsonl`;
    execFileSync('zstd', ['-d', '--force', filePath, '-o', tmpFile], { timeout: 30000 });
    const content = readFileSync(tmpFile, 'utf-8');
    // 清理临时文件
    try { execFileSync('rm', [tmpFile]); } catch {}
    return content;
  } catch (err) {
    throw new Error(`解压失败: ${filePath} - ${err.message}`);
  }
}

/**
 * 读取 JSONL 文件（自动处理 zstd 压缩）
 */
function readSessionFile(filePath) {
  if (filePath.endsWith('.zstd')) {
    return decompressZstd(filePath);
  }
  return readFileSync(filePath, 'utf-8');
}

/**
 * 解析 JSONL 事件流，提取用户/助手轮次
 */
function parseSessionEvents(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const events = [];
  
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.type && event.data) {
        events.push(event);
      }
    } catch {}
  }
  
  return events;
}

/**
 * 从事件流中提取对话轮次
 */
function extractTurns(events) {
  const turns = [];
  let currentTurn = null;
  
  for (const event of events) {
    const { type, data, seq } = event;
    
    if (type === 'user/message' && data?.content) {
      // 开始新用户轮次
      if (currentTurn && currentTurn.role === 'user') {
        turns.push(currentTurn);
      }
      currentTurn = {
        role: 'user',
        seq,
        content: extractText(data.content),
        timestamp: event.time,
      };
    } else if (type === 'assistant/message' && data?.message?.content) {
      // 助手回复
      if (!currentTurn) {
        currentTurn = { role: 'user', seq, content: '', timestamp: event.time };
      }
      currentTurn.assistant = extractText(data.message.content);
      currentTurn.assistantThinking = extractText(data.message.thinking);
      currentTurn.toolCalls = extractToolCalls(data.message.content);
    } else if (type === 'tool/call') {
      if (currentTurn) {
        currentTurn.actions = currentTurn.actions || [];
        currentTurn.actions.push({
          name: data.name,
          args: data.arguments,
        });
      }
    }
  }
  
  if (currentTurn) {
    turns.push(currentTurn);
  }
  
  return turns.filter(t => t.content || t.assistant);
}

/**
 * 从 content blocks 提取文本
 */
function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(b => b?.type === 'text' && b?.text)
      .map(b => b.text)
      .join('\n');
  }
  return '';
}

/**
 * 提取工具调用信息
 */
function extractToolCalls(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter(b => b?.type === 'tool-call' && b?.name)
    .map(b => ({ name: b.name, args: b.arguments }));
}

/**
 * 从会话内容生成记忆条目
 */
function generateMemoriesFromTurns(turns, sourcePath, sessionId) {
  const memories = [];
  
  for (const turn of turns) {
    // 跳过太短的轮次
    if ((!turn.content || turn.content.length < 10) && (!turn.assistant || turn.assistant.length < 10)) {
      continue;
    }
    
    // 用户消息 - 作为 insight 或 decision
    if (turn.content && turn.content.length > 20) {
      // 检测决策关键词
      const decisionKeywords = ['决定', '决策', '选择', '采用', '放弃', '最终', '结论', '方案'];
      let isDecision = false;
      for (const kw of decisionKeywords) {
        if (turn.content.includes(kw)) {
          isDecision = true;
          break;
        }
      }
      
      memories.push({
        id: randomUUID(),
        role: 'user',
        event_type: isDecision ? 'decision' : 'insight',
        content: turn.content.slice(0, 500),
        tags: ['session-import', 'user-turn', sessionId],
        importance: isDecision ? 0.8 : 0.5,
        source: `session:${sessionId}`,
        source_path: sourcePath,
        created_at: new Date(turn.timestamp).toISOString(),
      });
    }
    
    // 助手回复 - 作为 insight
    if (turn.assistant && turn.assistant.length > 20) {
      // 检测技术关键词
      const techKeywords = ['框架', '库', '依赖', '技术方案', '架构', '使用', '引入', '实现'];
      let isTech = false;
      for (const kw of techKeywords) {
        if (turn.assistant.includes(kw)) {
          isTech = true;
          break;
        }
      }
      
      memories.push({
        id: randomUUID(),
        role: 'agent',
        event_type: isTech ? 'insight' : 'convention',
        content: turn.assistant.slice(0, 500),
        tags: ['session-import', 'assistant-turn', sessionId],
        importance: isTech ? 0.7 : 0.4,
        source: `session:${sessionId}`,
        source_path: sourcePath,
        created_at: new Date(turn.timestamp).toISOString(),
      });
    }
    
    // 工具调用 - 作为 convention
    if (turn.actions && turn.actions.length > 0) {
      for (const action of turn.actions.slice(-3)) { // 只取最近3个
        if (action.name && action.args) {
          memories.push({
            id: randomUUID(),
            role: 'agent',
            event_type: 'convention',
            content: `工具调用: ${action.name}(${JSON.stringify(action.args).slice(0, 100)})`,
            tags: ['session-import', 'tool-call', sessionId, action.name],
            importance: 0.3,
            source: `session:${sessionId}`,
            source_path: sourcePath,
            created_at: new Date(turn.timestamp).toISOString(),
          });
        }
      }
    }
  }
  
  return memories;
}

/**
 * 去重检查 - 基于内容相似度
 */
function isDuplicate(memory, existingMemories, threshold = 0.8) {
  for (const existing of existingMemories) {
    // 完全相同来源跳过
    if (existing.source === memory.source && existing.content === memory.content) {
      return true;
    }
    
    // 内容相似度高跳过
    if (memory.content.length > 10 && existing.content.length > 10) {
      const commonWords = countCommonWords(memory.content, existing.content);
      if (commonWords > 0.8 * Math.min(memory.content.length, existing.content.length)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 计算两个字符串的公共词比例（简单实现）
 */
function countCommonWords(str1, str2) {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  let common = 0;
  for (const word of words1) {
    if (words2.has(word)) common++;
  }
  return common;
}

/**
 * 扫描 DSH sessions 目录
 */
function scanSessions(rootDir = DSH_SESSIONS_ROOT) {
  if (!existsSync(rootDir)) {
    return { sessions: [], error: 'Sessions directory not found' };
  }
  
  const sessions = [];
  
  function scanDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // 递归扫描子目录
          scanDir(fullPath);
        } else if (entry.isFile() && (entry.name === 'session.jsonl' || entry.name === 'session.jsonl.zstd')) {
          const stats = statSync(fullPath);
          sessions.push({
            path: fullPath,
            sessionId: entry.name.replace('.jsonl', '').replace('.jsonl.zstd', '').replace('session-', ''),
            size: stats.size,
            mtime: stats.mtime,
          });
        }
      }
    } catch (err) {
      console.warn(`[Mnemosyne] 扫描目录失败: ${dir} - ${err.message}`);
    }
  }
  
  scanDir(rootDir);
  return { sessions, error: null };
}

/**
 * 导入历史会话到当前 workspace
 * @param {string} workspaceRoot - 目标工作空间根目录
 * @param {Object} options - 配置选项
 * @param {string} [options.sessionsRoot] - DSH sessions 目录（默认 ~/.dsh/sessions）
 * @param {number} [options.maxSessions=50] - 最多处理会话数
 * @param {number} [options.dedupThreshold=0.8] - 去重阈值（0-1）
 * @param {number} [options.maxContentLength=500] - 内容最大长度
 * @param {boolean} [options.dryRun=false] - 预览模式，不写盘
 * @param {Object} [options.plugin] - MnemosynePlugin 实例
 */
export async function importHistory(workspaceRoot, options = {}) {
  const {
    sessionsRoot = DSH_SESSIONS_ROOT,
    maxSessions = 50,
    dedupThreshold = 0.8,
    maxContentLength = 500,
    dryRun = false,
    plugin,
  } = options;

  const result = {
    imported: 0,
    skipped_duplicates: 0,
    errors: [],
    sessions: [],
  };

  // 1. 扫描 sessions
  const scanResult = scanSessions(sessionsRoot);
  if (scanResult.error) {
    result.errors.push(scanResult.error);
    return result;
  }

  // 2. 加载当前 workspace bank
  const ws = plugin.getWorkspace(workspaceRoot);
  const bank = ws.bank;

  // 3. 遍历每个 session
  const sessionsToProcess = scanResult.sessions
    .sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
    .slice(0, maxSessions);

  for (const session of sessionsToProcess) {
    try {
      // 读取会话文件
      const content = readSessionFile(session.path);
      const events = parseSessionEvents(content);

      if (events.length === 0) {
        result.sessions.push({
          path: session.path,
          status: 'skipped',
          reason: 'no-events',
        });
        continue;
      }

      // 提取轮次
      const turns = extractTurns(events);

      if (turns.length === 0) {
        result.sessions.push({
          path: session.path,
          status: 'skipped',
          reason: 'no-turns',
        });
        continue;
      }

      // 生成记忆
      const memories = generateMemoriesFromTurns(turns, session.path, session.sessionId);

      if (memories.length === 0) {
        result.sessions.push({
          path: session.path,
          status: 'skipped',
          reason: 'no-memories',
        });
        continue;
      }

      // 去重并导入
      let imported = 0;
      let skipped = 0;

      for (const memory of memories) {
        if (!isDuplicate(memory, [...bank.memories, ...bank.working], dedupThreshold)) {
          // 截断内容
          memory.content = memory.content.slice(0, maxContentLength);
          if (!dryRun) {
            bank.working.push(memory);
          }
          imported++;
        } else {
          skipped++;
        }
      }

      result.imported += imported;
      result.skipped_duplicates += skipped;

      result.sessions.push({
        path: session.path,
        status: 'imported',
        turns: turns.length,
        memoriesGenerated: memories.length,
        memoriesImported: imported,
        memoriesSkipped: skipped,
      });

    } catch (err) {
      result.errors.push({
        path: session.path,
        error: err.message,
      });
    }
  }

  // 4. 保存 bank（非 dryRun 模式）
  if (!dryRun) {
    const saveBank = (workspaceRoot, bankData) => {
      const { join, dirname, mkdirSync, writeFileSync, existsSync } = require('node:fs');
      const ROOT_DIR = join(__dirname, '..', '..', '..', '..');
      const safeName = basename(workspaceRoot).replace(/[^a-z0-9]/gi, '_');
      const path = join(ROOT_DIR, 'data', 'mnemosyne', 'banks', safeName, 'memory.json');
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(bankData, null, 2));
    };
    saveBank(workspaceRoot, bank);
  }

  return result;
}

/**
 * 获取 bank 路径（内部辅助函数）
 */
function getBankPath(workspaceRoot) {
  const { join, basename } = require('node:path');
  const { mkdirSync, writeFileSync, existsSync } = require('node:fs');
  const ROOT_DIR = join(__dirname, '..', '..', '..', '..');
  const safeName = basename(workspaceRoot).replace(/[^a-z0-9]/gi, '_');
  return join(ROOT_DIR, 'data', 'mnemosyne', 'banks', safeName, 'memory.json');
}

/**
 * 列出可用的历史会话（供预览）
 */
export function listAvailableSessions(rootDir = DSH_SESSIONS_ROOT, options = {}) {
  const { limit = 20, format = 'summary' } = options;
  const scanResult = scanSessions(rootDir);
  
  if (scanResult.error) {
    return { error: scanResult.error };
  }
  
  const sessions = scanResult.sessions
    .sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
    .slice(0, limit);
  
  if (format === 'summary') {
    return {
      total: scanResult.sessions.length,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        path: s.path,
        size: s.size,
        mtime: s.mtime.toISOString(),
      })),
    };
  }
  
  return { total: scanResult.sessions.length, sessions };
}

export default { importHistory, listAvailableSessions };
