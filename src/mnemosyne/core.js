/**
 * Mnemosyne Memory Plugin - 对标 Hindsight Coding Agents
 * 
 * 核心功能：
 * - Per-workspace 记忆银行（自动按工作目录隔离）
 * - Session Reflection（自动反思与知识提取）
 * - 知识页面（架构/惯例/决策持久化摘要）
 * - Git历史导入（commit messages + diff 种子）
 * - 上下文注入（pre-step 自动注入相关记忆）
 * - DSH 工具：mnemo_recall / mnemo_store / mnemo_reflect / mnemo_pages
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// ─── 支持的提供商 ──────────────────────────────────────
const PROVIDERS = {
  openai: {
    embeddingEndpoint: 'https://api.openai.com/v1/embeddings',
    chatEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'text-embedding-3-small',
    dimensions: 1536,
  },
  deepseek: {
    embeddingEndpoint: 'https://api.deepseek.com/v1/embeddings',
    chatEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-embed',
    dimensions: 2048,
  },
  agnes: {
    embeddingEndpoint: 'https://apihub.agnes-ai.cn/v1/embeddings',
    chatEndpoint: 'https://apihub.agnes-ai.cn/v1/chat/completions',
    defaultModel: 'agnes-embedding',
    dimensions: 1536,
  },
  gemini: {
    embeddingEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent',
    chatEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    defaultModel: 'gemini-embedding-001',
    dimensions: 768,
    apiStyle: 'gemini', // Gemini uses different request/response format
  },
};

// ─── 向量工具函数 ──────────────────────────────────────

/**
 * 计算余弦相似度
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 调用 Embedding API 生成向量
 */
async function generateEmbedding(text, config = {}) {
  const { apiKey, provider = 'openai', model, dimensions, endpoint: customEndpoint } = config;

  if (!apiKey) {
    console.warn('[Mnemosyne] Embedding API key not configured, skipping vector storage');
    return null;
  }

  try {
    const providerConfig = PROVIDERS[provider] || PROVIDERS.openai;
    const resolvedEndpoint = customEndpoint
      || (providerConfig.apiStyle === 'gemini'
        ? `${providerConfig.embeddingEndpoint.replace('{model}', model || providerConfig.defaultModel)}?key=${apiKey}`
        : providerConfig.embeddingEndpoint);

    if (providerConfig.apiStyle === 'gemini') {
      // Gemini API 格式
      const response = await fetch(resolvedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          ...(dimensions ? { outputDimensionality: dimensions } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini Embedding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding?.values || null;
    }

    // OpenAI 兼容格式
    const response = await fetch(resolvedEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: model || providerConfig.defaultModel,
        ...(dimensions ? { dimensions } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.error('[Mnemosyne] Embedding generation failed:', err.message);
    return null;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..', '..', '..');

// ─── 配置 ───────────────────────────────────────────────

const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:8888',
  apiToken: null,
  enabled: true,
  reflectTimeoutMs: 120000,
  autoReflect: true,
  gitIngest: 'message', // 'message' | 'full' | 'none'
  maxParallelRetains: 10,
  bankIdTemplate: 'mnemosyne::{gitProject}',
  observationScopes: 'shared',
  retainSessions: true,
  pageRefreshEveryTurns: 10,
  // 共享记忆配置
  sharedBanks: {}, // workspaceRoot -> bankPath，多个 workspace 可指向同一 bank
  // 向量搜索配置
  embedding: {
    enabled: false,
    provider: 'openai', // 'openai' | 'deepseek' | 'agnes' | 'gemini'
    model: 'text-embedding-3-small',
    dimensions: 1536,
    apiKey: process.env.MNEMOSYNE_EMBEDDING_API_KEY || null,
    endpoint: null,
  },
  // LLM 反思配置
  reflect: {
    enabled: false,
    provider: 'openai', // 'openai' | 'deepseek' | 'agnes' | 'gemini'
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 30000,
    apiKey: process.env.MNEMOSYNE_REFLECT_API_KEY || null,
    endpoint: null,
  },
};

function loadConfig() {
  const configPath = join(ROOT_DIR, 'config', 'mnemosyne.json');
  if (existsSync(configPath)) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(configPath, 'utf-8')) };
    } catch {}
  }
  return { ...DEFAULT_CONFIG };
}

// ─── 数据库（每个 workspace 一个 JSON 文件，支持共享 bank）──────────────

function getBankPath(workspaceRoot, config = null) {
  // 检查是否配置了共享 bank
  if (config?.sharedBanks?.[workspaceRoot]) {
    return config.sharedBanks[workspaceRoot];
  }
  const safeName = basename(workspaceRoot).replace(/[^a-z0-9]/gi, '_');
  return join(ROOT_DIR, 'data', 'mnemosyne', 'banks', safeName, 'memory.json');
}

function loadBank(workspaceRoot, config = null) {
  const path = getBankPath(workspaceRoot, config);
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, 'utf-8')); } catch {}
  }
  return { memories: [], pages: [], working: [], meta: { created: new Date().toISOString() } };
}

function saveBank(workspaceRoot, bank, config = null) {
  const path = getBankPath(workspaceRoot, config);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(bank, null, 2));
}

// ─── Git 历史导入 ────────────────────────────────────────

function execGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', () => {});
    proc.on('close', code => code === 0 ? resolve(out.trim()) : resolve(''));
    proc.on('error', () => resolve(''));
  });
}

async function seedGitHistory(workspaceRoot, bank, limit = 300) {
  if (!existsSync(join(workspaceRoot, '.git'))) return { seeded: 0, error: 'not-a-git-repo' };

  try {
    // 获取 commit messages
    const log = await execGit(['log', `--max-count=${limit}`, '--pretty=format:%H%n%s%n%b%n---SEPARATOR---'], workspaceRoot);
    if (!log) return { seeded: 0 };

    const commits = log.split('---SEPARATOR---').filter(s => s.trim());
    let added = 0;

    for (const commit of commits) {
      const lines = commit.trim().split('\n');
      if (lines.length < 2) continue;
      const sha = lines[0];
      const subject = lines[1];
      const body = lines.slice(2).join('\n').replace(/^\s+$/, '').trim();
      const content = body ? `${subject}\n${body}` : subject;

      // 去重
      const exists = bank.memories.some(m => m.source === `git:${sha}`);
      if (!exists) {
        const memory = {
          id: randomUUID(),
          role: 'git',
          event_type: 'commit',
          content,
          tags: ['git', 'commit', `sha:${sha.slice(0, 8)}`],
          importance: 0.6,
          source: `git:${sha}`,
          created_at: new Date().toISOString(),
        };
        // 异步计算向量（不阻塞）
        generateEmbedding(content).then(vector => {
          if (vector) {
            const idx = bank.memories.findIndex(m => m.id === memory.id);
            if (idx >= 0) {
              bank.memories[idx].vector = vector;
              saveBank(workspaceRoot, bank);
            }
          }
        });
        bank.memories.push(memory);
        added++;
      }
    }

    saveBank(workspaceRoot, bank);
    return { seeded: added, total: commits.length };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── Session Reflection（自动反思）───────────────────────

function extractInsights(turns, bank) {
  // 简单的启发式规则提取洞察
  const insights = [];
  
  // 检测决策模式
  const decisionKeywords = ['决定', '决策', '选择', '采用', '放弃', '最终', '结论'];
  for (const turn of turns) {
    if (turn.role === 'assistant') {
      for (const kw of decisionKeywords) {
        if (turn.content.includes(kw)) {
          // 提取决策相关内容
          const sentences = turn.content.split(/[。！？\n]/).filter(s => s.includes(kw));
          for (const sentence of sentences.slice(-2)) {
            const existing = bank.memories.find(m => m.content === sentence.trim());
            if (!existing) {
              insights.push({
                type: 'decision',
                content: sentence.trim(),
                importance: 0.85,
              });
            }
          }
        }
      }
    }
  }
  
  // 检测技术选型
  const techKeywords = ['框架', '库', '依赖', '技术方案', '架构', '使用', '引入'];
  for (const turn of turns) {
    if (turn.role === 'assistant') {
      for (const kw of techKeywords) {
        if (turn.content.includes(kw)) {
          const sentences = turn.content.split(/[。！？\n]/).filter(s => s.includes(kw) && s.length > 15);
          for (const sentence of sentences.slice(-1)) {
            insights.push({
              type: 'insight',
              content: sentence.trim(),
              importance: 0.7,
            });
          }
        }
      }
    }
  }
  
  return insights;
}

/**
 * 调用 LLM 进行深度反思
 */
async function callLLMReflect(turns, config) {
  const reflectConfig = config?.reflect;
  if (!reflectConfig?.enabled || !reflectConfig?.apiKey) {
    return null;
  }

  const { model, temperature, maxTokens, timeoutMs } = reflectConfig;
  // 解析 endpoint：优先使用自定义，否则根据 provider 选择默认
  const providerConfig = PROVIDERS[reflectConfig.provider] || PROVIDERS.openai;
  const endpoint = reflectConfig.endpoint
    || providerConfig.chatEndpoint
    || PROVIDERS.openai.chatEndpoint;
  const isGemini = providerConfig.apiStyle === 'gemini';

  // 构建对话摘要
  const conversationSummary = turns
    .filter(t => t.content || t.assistant)
    .map(t => {
      const userPart = t.content ? `用户: ${t.content.slice(0, 300)}` : '';
      const assistantPart = t.assistant ? `\n助手: ${t.assistant.slice(0, 300)}` : '';
      return `${userPart}${assistantPart}`;
    })
    .join('\n\n')
    .slice(0, 8000);

  if (!conversationSummary.trim()) {
    return null;
  }

  const prompt = `请分析以下对话记录，提取其中的关键决策、技术洞察和重要结论。

对话内容：
${conversationSummary}

请以 JSON 格式返回分析结果，包含以下字段：
{
  "decisions": ["决策1", "决策2"],
  "insights": ["洞察1", "洞察2"],
  "conventions": ["惯例1", "惯例2"],
  "open_questions": ["待解决问题1"]
}

只返回 JSON，不要其他解释。`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 30000);

    let responseBody;
    let responseHeaders;

    if (isGemini) {
      // Gemini API 格式
      const geminiEndpoint = endpoint.replace('{model}', model) + `?key=${reflectConfig.apiKey}`;
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: temperature || 0.3,
            maxOutputTokens: maxTokens || 2000,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) return null;
      responseBody = content;
    } else {
      // OpenAI 兼容格式
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${reflectConfig.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature || 0.3,
          max_tokens: maxTokens || 2000,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      responseBody = content;
    }

    // 解析 JSON 响应（处理 markdown 代码块包裹的情况）
    try {
      // 移除 markdown 代码块标记
      let jsonStr = responseBody.trim();
      const markdownMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        jsonStr = markdownMatch[1].trim();
      }
      const result = JSON.parse(jsonStr);
      return {
        decisions: Array.isArray(result.decisions) ? result.decisions : [],
        insights: Array.isArray(result.insights) ? result.insights : [],
        conventions: Array.isArray(result.conventions) ? result.conventions : [],
        openQuestions: Array.isArray(result.open_questions) ? result.open_questions : [],
      };
    } catch (parseErr) {
      console.warn('[Mnemosyne] LLM 反思返回非 JSON，回退到启发式模式:', parseErr.message);
      return null;
    }
  } catch (err) {
    console.warn('[Mnemosyne] LLM 反思失败，回退到启发式模式:', err.message);
    return null;
  }
}

async function runReflection(workspaceRoot, bank, turns, config = null) {
  let insights = [];
  let method = 'heuristic';

  // 尝试 LLM 深度反思
  if (config?.reflect?.enabled && config.reflect.apiKey) {
    const llmResult = await callLLMReflect(turns, config);
    if (llmResult) {
      method = 'llm';
      // 转换 LLM 结果为 insights 格式
      for (const d of llmResult.decisions) {
        insights.push({ type: 'decision', content: d, importance: 0.9 });
      }
      for (const i of llmResult.insights) {
        insights.push({ type: 'insight', content: i, importance: 0.75 });
      }
      for (const c of llmResult.conventions) {
        insights.push({ type: 'convention', content: c, importance: 0.6 });
      }
    }
  }

  // 如果 LLM 失败或未配置，使用启发式规则
  if (insights.length === 0) {
    insights = extractInsights(turns, bank);
  }

  let added = 0;

  for (const insight of insights) {
    const existing = bank.memories.find(m => m.content === insight.content);
    if (!existing) {
      bank.memories.push({
        id: randomUUID(),
        role: 'reflection',
        event_type: insight.type,
        content: insight.content,
        tags: [insight.type, `auto-reflection`, method],
        importance: insight.importance,
        source: `reflection:${method}`,
        created_at: new Date().toISOString(),
      });
      added++;
    }
  }

  // 触发巩固：工作记忆 → 长期记忆
  const toConsolidate = bank.working.filter(m =>
    m.importance >= 0.7 || (Date.now() - new Date(m.created_at).getTime()) > 3600000
  );

  for (const work of toConsolidate) {
    bank.memories.push({ ...work, role: 'consolidated' });
    bank.working = bank.working.filter(w => w.id !== work.id);
  }

  if (added > 0 || toConsolidate.length > 0) {
    saveBank(workspaceRoot, bank);
  }

  return {
    insights_added: added,
    consolidated: toConsolidate.length,
    method,
  };
}

// ─── 知识页面生成 ────────────────────────────────────────

function generateKnowledgePages(bank) {
  const pages = [];

  // 按类型聚合
  const byType = {};
  for (const m of bank.memories) {
    if (!byType[m.event_type]) byType[m.event_type] = [];
    byType[m.event_type].push(m);
  }

  // 架构页面
  if (byType['commit']?.length > 0 || byType['insight']?.length > 0) {
    pages.push({
      id: 'architecture',
      title: '架构与决策',
      content: formatPageContent('architecture', byType),
      updated: new Date().toISOString(),
    });
  }

  // 惯例页面
  pages.push({
    id: 'conventions',
    title: '开发惯例',
    content: formatPageContent('conventions', byType),
    updated: new Date().toISOString(),
  });

  // 进行中项目
  const initiatives = bank.memories.filter(m => m.event_type === 'initiative');
  if (initiatives.length > 0) {
    pages.push({
      id: 'initiatives',
      title: '进行中项目',
      content: initiatives.map(i => `- **${i.content}** (importance: ${i.importance})`).join('\n'),
      updated: new Date().toISOString(),
    });
  }

  return pages;
}

/**
 * 计算知识页面的 diff（增量更新）
 * @param {Object} bank - 记忆银行
 * @param {Array} oldPages - 旧的页面列表
 * @returns {Object} diff 结果
 */
function computePagesDiff(bank, oldPages = []) {
  const newPages = generateKnowledgePages(bank);
  const oldPageMap = new Map();
  for (const page of oldPages) {
    oldPageMap.set(page.id, page);
  }

  const diffs = [];
  const unchanged = [];

  for (const newPage of newPages) {
    const oldPage = oldPageMap.get(newPage.id);
    if (!oldPage) {
      diffs.push({ id: newPage.id, action: 'added', page: newPage });
    } else if (oldPage.content !== newPage.content) {
      diffs.push({ id: newPage.id, action: 'modified', old: oldPage, new: newPage });
    } else {
      unchanged.push(newPage.id);
    }
  }

  // 检测删除的页面
  for (const [id, oldPage] of oldPageMap) {
    if (!newPages.find(p => p.id === id)) {
      diffs.push({ id, action: 'deleted', page: oldPage });
    }
  }

  return {
    added: diffs.filter(d => d.action === 'added').map(d => d.id),
    modified: diffs.filter(d => d.action === 'modified').map(d => d.id),
    deleted: diffs.filter(d => d.action === 'deleted').map(d => d.id),
    unchanged,
    diffs,
    newPages,
  };
}

function formatPageContent(type, byType) {
  const lines = [];
  
  if (type === 'architecture') {
    lines.push('## 关键决策\n');
    const decisions = byType['decision']?.slice(-10) || [];
    for (const d of decisions) {
      lines.push(`- ${d.content}`);
    }
    if (decisions.length === 0) lines.push('*暂无记录*');
    
    lines.push('\n## 技术栈\n');
    const insights = byType['insight']?.slice(-5) || [];
    for (const i of insights) {
      lines.push(`- ${i.content}`);
    }
    if (insights.length === 0) lines.push('*暂无记录*');
  } else if (type === 'conventions') {
    lines.push('## 代码惯例\n');
    lines.push('- 遵循项目现有编码风格');
    lines.push('- 提交信息使用 Conventional Commits');
    lines.push('- 关键决策需记录到记忆系统');
  }
  
  return lines.join('\n');
}

// ─── 检索引擎 ────────────────────────────────────────────

/**
 * 向量语义检索（需要 embedding API key）
 */
async function recallWithEmbeddings(workspaceRoot, query, options = {}, pluginConfig = null) {
  const bank = loadBank(workspaceRoot);
  const { k = 5, minImportance = 0, role = null } = options;

  const allMemories = [...bank.memories, ...bank.working];
  const filtered = allMemories
    .filter(m => m.importance >= minImportance)
    .filter(m => !role || m.role === role || m.role.startsWith(role + ':'));

  // 生成查询向量
  const config = pluginConfig || DEFAULT_CONFIG;
  const queryVector = await generateEmbedding(query, config.embedding);
  if (!queryVector) {
    // 回退到关键词搜索
    return recall(workspaceRoot, query, options);
  }

  // 计算余弦相似度
  const results = filtered
    .map(m => {
      if (m.vector && m.vector.length === queryVector.length) {
        const sim = cosineSimilarity(queryVector, m.vector);
        // 结合时间衰减
        const ageHours = (Date.now() - new Date(m.created_at).getTime()) / 3600000;
        const timeBonus = Math.max(0, 0.2 - ageHours / 168);
        return { ...m, similarity: Math.min(1, sim + timeBonus) };
      }
      // 无向量的记忆使用关键词降级
      let keywordScore = 0;
      const searchTerms = query.split(/\s+/).filter(t => t.length > 1);
      for (const term of searchTerms) {
        if (m.content.toLowerCase().includes(term.toLowerCase())) keywordScore += 0.4;
        for (const tag of (m.tags || [])) {
          if (tag.toLowerCase().includes(term.toLowerCase())) keywordScore += 0.3;
        }
      }
      const ageHours = (Date.now() - new Date(m.created_at).getTime()) / 3600000;
      keywordScore += Math.max(0, 0.3 - ageHours / 168);
      return { ...m, similarity: Math.min(1, keywordScore) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return results.map(r => ({
    memory_id: r.id,
    event_type: r.event_type,
    content: r.content,
    role: r.role,
    importance: r.importance,
    timestamp: new Date(r.created_at).getTime(),
    similarity: parseFloat(r.similarity.toFixed(3)),
    tags: r.tags || [],
    search_method: r.vector ? 'vector' : 'keyword',
  }));
}

/**
 * 纯关键词检索（无 embedding 时降级使用）
 */
function recall(workspaceRoot, query, options = {}) {
  const bank = loadBank(workspaceRoot);
  const { k = 5, minImportance = 0, role = null } = options;

  const allMemories = [...bank.memories, ...bank.working];
  const searchTerms = query.split(/\s+/).filter(t => t.length > 1);

  const results = allMemories
    .filter(m => m.importance >= minImportance)
    .filter(m => !role || m.role === role || m.role.startsWith(role + ':'))
    .map(m => {
      let score = 0;
      for (const term of searchTerms) {
        if (m.content.toLowerCase().includes(term.toLowerCase())) score += 0.4;
        for (const tag of (m.tags || [])) {
          if (tag.toLowerCase().includes(term.toLowerCase())) score += 0.3;
        }
      }
      // 时间衰减
      const ageHours = (Date.now() - new Date(m.created_at).getTime()) / 3600000;
      score += Math.max(0, 0.3 - ageHours / 168);
      return { ...m, similarity: Math.min(1, score) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return results.map(r => ({
    memory_id: r.id,
    event_type: r.event_type,
    content: r.content,
    role: r.role,
    importance: r.importance,
    timestamp: new Date(r.created_at).getTime(),
    similarity: parseFloat(r.similarity.toFixed(3)),
    tags: r.tags || [],
    search_method: 'keyword',
  }));
}

// ─── 公共 API ────────────────────────────────────────────

export const MnemosynePlugin = {
  name: 'mnemosyne-memory',
  
  /** 初始化插件 */
  init(configOverride = {}) {
    // 优先从配置文件加载，再覆盖传入的配置
    const fileConfig = loadConfig();
    this.config = { ...fileConfig, ...configOverride };
    this.workspaces = new Map(); // root -> bank
    return this;
  },
  
  /** 获取或创建工作空间 */
  getWorkspace(root) {
    if (!this.workspaces.has(root)) {
      this.workspaces.set(root, {
        bank: loadBank(root),
        turnCount: 0,
        lastReflectTurn: 0,
      });
    }
    return this.workspaces.get(root);
  },
  
  /** 存储记忆 */
  async remember(workspaceRoot, event) {
    const ws = this.getWorkspace(workspaceRoot);
    const memory = {
      id: randomUUID(),
      role: event.role || 'agent',
      event_type: event.type,
      content: event.content,
      tags: event.tags || [event.type],
      importance: event.importance ?? 0.5,
      source: event.source || 'agent',
      context: event.context || null,
      created_at: new Date().toISOString(),
    };
    ws.bank.working.push(memory);
    // 异步计算并存储向量（不阻塞）
    if (this.config.embedding?.enabled && this.config.embedding?.apiKey) {
      generateEmbedding(event.content, this.config.embedding)
        .then(vector => {
          if (vector) {
            const idx = ws.bank.working.findIndex(m => m.id === memory.id);
            if (idx >= 0) {
              ws.bank.working[idx].vector = vector;
              saveBank(workspaceRoot, ws.bank);
            }
          }
        })
        .catch(() => {});
    }
    saveBank(workspaceRoot, ws.bank);
    return memory.id;
  },
  
  /** 检索记忆（支持向量语义搜索） */
  async recall(workspaceRoot, query, options = {}) {
    const config = this.config;
    if (config.embedding?.enabled && config.embedding?.apiKey) {
      return await recallWithEmbeddings(workspaceRoot, query, options, config);
    }
    return recall(workspaceRoot, query, options);
  },
  
  /** 触发反思 */
  async reflect(workspaceRoot, turns = []) {
    const ws = this.getWorkspace(workspaceRoot);
    const result = await runReflection(workspaceRoot, ws.bank, turns, this.config);
    // 重新生成知识页面（使用 delta 更新）
    ws.bank.pages = generateKnowledgePages(ws.bank);
    saveBank(workspaceRoot, ws.bank);
    return result;
  },

  /** 配置共享 bank */
  configureSharedBank(workspaceRoot, bankPath) {
    if (!this.config.sharedBanks) {
      this.config.sharedBanks = {};
    }
    this.config.sharedBanks[workspaceRoot] = bankPath;
    // 重新加载 bank
    const ws = this.getWorkspace(workspaceRoot);
    ws.bank = loadBank(workspaceRoot, this.config);
  },
  
  /** 获取知识页面 */
  getPages(workspaceRoot) {
    const ws = this.getWorkspace(workspaceRoot);
    return ws.bank.pages || generateKnowledgePages(ws.bank);
  },

  /** 列出所有页面 */
  listPages(workspaceRoot) {
    const pages = this.getPages(workspaceRoot);
    return pages.map(p => ({
      id: p.id,
      title: p.title,
      description: p.content.split('\n')[0]?.replace(/^##\s*/, '') || '',
    }));
  },

  /** 读取单个页面 */
  readPage(workspaceRoot, pageId) {
    const pages = this.getPages(workspaceRoot);
    return pages.find(p => p.id === pageId) || null;
  },

  /** 计算页面变更 diff */
  pagesDiff(workspaceRoot) {
    const ws = this.getWorkspace(workspaceRoot);
    const oldPages = ws.bank.pages || [];
    return computePagesDiff(ws.bank, oldPages);
  },

  /** 增量更新知识页面（只保存变更部分） */
  updatePagesDelta(workspaceRoot) {
    const ws = this.getWorkspace(workspaceRoot);
    const oldPages = ws.bank.pages || [];
    const diff = computePagesDiff(ws.bank, oldPages);

    // 只保存有变化的页面
    const updatedPages = [];
    const existingPageMap = new Map();
    for (const p of oldPages) {
      existingPageMap.set(p.id, p);
    }

    for (const page of generateKnowledgePages(ws.bank)) {
      existingPageMap.set(page.id, page);
    }

    for (const page of existingPageMap.values()) {
      updatedPages.push(page);
    }

    ws.bank.pages = updatedPages;
    saveBank(workspaceRoot, ws.bank);

    return diff;
  },
  
  /** 导入 Git 历史 */
  async seedGit(workspaceRoot, limit = 300) {
    const ws = this.getWorkspace(workspaceRoot);
    return await seedGitHistory(workspaceRoot, ws.bank, limit);
  },

  /** 导入历史会话 */
  async importHistory(workspaceRoot, options = {}) {
    const { importHistory: importHistoryFn } = await import('./import-history.js');
    return await importHistoryFn(workspaceRoot, { ...options, plugin: this });
  },

  /** 清除工作空间 */
  dispose(workspaceRoot) {
    this.workspaces.delete(workspaceRoot);
  },
  
  /** 获取统计 */
  getStats(workspaceRoot) {
    const ws = this.getWorkspace(workspaceRoot);
    return {
      longTermCount: ws.bank.memories.length,
      workingCount: ws.bank.working.length,
      pageCount: (ws.bank.pages || []).length,
      avgImportance: ws.bank.memories.length > 0
        ? (ws.bank.memories.reduce((s, m) => s + m.importance, 0) / ws.bank.memories.length).toFixed(2)
        : 0,
    };
  },
};

// 默认导出
export default MnemosynePlugin;
