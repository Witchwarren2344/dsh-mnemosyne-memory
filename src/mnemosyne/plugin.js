/**
 * Mnemosyne DSH Plugin Entry Point
 * 
 * 对标 Hindsight DSH Integration 的 Cordis 插件入口
 * 
 * 生命周期：
 * - agent/session-start  -> seedIfCold（冷启动检查 + Git种子）
 * - agent/pre-step       -> recall + 上下文注入
 * - agent/turn-stopping  -> write-back（会话回写）
 * - ctx.tools            -> 注册 mnemo_* 工具集
 */

import { MnemosynePlugin } from './core.js';
import { registerMnemosyneTools, MNEMOSYNE_TOOLS } from './tools.js';

const HARNESS = 'dsh';

/**
 * 获取工作空间根目录
 */
function getWorkspaceRoot(agent) {
  return agent?.session?.header?.cwd || process.cwd();
}

/**
 * DSH Cordis 插件定义
 */
export const plugin = {
  name: 'mnemosyne-memory',
  description: 'Mnemosyne 记忆插件 - 对标 Hindsight Coding Agents，提供 per-workspace 长期记忆、自动反思、知识页面和Git历史导入',
  
  /**
   * 插件初始化
   */
  apply(ctx, config = {}) {
    // 初始化 Mnemosyne 核心
    MnemosynePlugin.init(config);
    
    // 注册工具
    registerMnemosyneTools(ctx.tools, MnemosynePlugin);
    console.log(`[Mnemosyne] 工具已注册: ${MNEMOSYNE_TOOLS.join(', ')}`);
    
    // 绑定生命周期事件
    bindLifecycle(ctx);
    
    return plugin;
  }
};

/**
 * 绑定 Cordis 生命周期事件
 */
function bindLifecycle(ctx) {
  
  // 1. Session Start: 冷启动检查 + Git 种子
  ctx.on('agent/session-start', async ({ agent }) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (!workspaceRoot) return;
    
    const ws = MnemosynePlugin.getWorkspace(workspaceRoot);
    
    // 只在首次打开时进行种子导入
    if (!ws.seeded) {
      ws.seeded = true;
      // 后台启动种子（不阻塞 session 打开）
      MnemosynePlugin.seedGit(workspaceRoot, 100).catch(err => {
        console.warn('[Mnemosyne] Git种子失败:', err.message);
      });
    }
  });
  
  // 2. Pre-Step: 检索相关记忆并注入上下文
  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (!workspaceRoot) return next();
    
    const ws = MnemosynePlugin.getWorkspace(workspaceRoot);
    ws.turnCount = (ws.turnCount || 0) + 1;
    
    // 每 N 轮重新注入页面清单
    const shouldRefresh = ws.turnCount % (MnemosynePlugin.config.pageRefreshEveryTurns || 10) === 1;
    
    try {
      // 从当前 prompt 提取查询关键词
      const messages = agent?.session?.events || [];
      const lastUserMsg = [...messages].reverse().find(e => 
        e.type === 'user/message' && e.data?.source?.kind === 'user'
      );
      
      const query = lastUserMsg?.data?.content
        ?.filter(b => b.type === 'text' && b.text)
        .map(b => b.text)
        .join(' ')
        .slice(0, 500) || '';
      
      if (!query.trim()) return next();
      
      // 检索相关记忆
      const memories = MnemosynePlugin.recall(workspaceRoot, query, { k: 5, minImportance: 0.3 });
      
      // 获取知识页面
      const pages = shouldRefresh ? MnemosynePlugin.listPages(workspaceRoot) : [];
      
      if (memories.length === 0 && pages.length === 0) {
        return next();
      }
      
      // 构建注入上下文
      const injectionParts = [];
      
      if (pages.length > 0) {
        injectionParts.push('## 知识页面清单\n' + 
          pages.map(p => `- [${p.id}] ${p.title}: ${p.description}`).join('\n'));
      }
      
      if (memories.length > 0) {
        injectionParts.push('## 相关历史记忆\n' +
          memories.map(m => 
            `> 🧠 **${m.event_type}** (similarity: ${m.similarity}, importance: ${m.importance})\n> ${m.content}`
          ).join('\n\n'));
      }
      
      const injection = injectionParts.join('\n\n');
      
      // 将注入注入到下一轮（通过修改 next 的返回值）
      // DSH 的 pre-step 机制：返回包含注入消息的决策
      const decision = await next();
      
      // 在决策中添加注入（如果支持）
      if (decision && decision.kind === 'enter') {
        decision.messages = decision.messages || [];
        decision.messages.unshift({
          role: 'user',
          content: [{ type: 'text', text: injection }],
          source: { kind: 'plugin', plugin: 'mnemosyne-memory' },
        });
      }
      
      return decision;
      
    } catch (err) {
      console.warn('[Mnemosyne] pre-step 注入失败:', err.message);
      return next();
    }
  }, { prepend: true });
  
  // 3. Turn Stopping: 会话回写 + 自动反思
  ctx.on('agent/turn-stopping', async ({ agent }) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (!workspaceRoot) return;
    
    const ws = MnemosynePlugin.getWorkspace(workspaceRoot);
    ws.turnCount = (ws.turnCount || 0) + 1;
    
    // 提取当前轮次的对话
    const events = agent?.session?.events || [];
    const turns = extractTurns(events);
    
    if (turns.length === 0) return;
    
    // 回写到工作记忆
    for (const turn of turns) {
      MnemosynePlugin.remember(workspaceRoot, {
        type: 'session_turn',
        content: `${turn.role}: ${turn.content?.slice(0, 200)}`,
        role: turn.role === 'assistant' ? 'agent' : 'user',
        tags: ['session', `turn-${turn.index}`],
        importance: 0.3,
        source: 'session-writeback',
      });
    }
    
    // 每 5 轮触发一次反思
    if (ws.turnCount % 5 === 0 && MnemosynePlugin.config.autoReflect) {
      MnemosynePlugin.reflect(workspaceRoot, turns).catch(err => {
        console.warn('[Mnemosyne] 反思失败:', err.message);
      });
    }
  });
  
  // 4. Agent Disposed: 清理
  ctx.on('agent/disposed', ({ agent }) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (workspaceRoot) {
      MnemosynePlugin.dispose(workspaceRoot);
    }
  });
}

/**
 * 从 DSH 事件日志提取对话轮次
 */
function extractTurns(events) {
  const turns = [];
  let currentTurn = null;
  
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    
    if (event.type === 'user/message') {
      if (currentTurn) turns.push(currentTurn);
      const data = event.data || {};
      currentTurn = {
        role: 'user',
        index: turns.length,
        content: extractText(data.content),
        timestamp: event.time,
      };
    } else if (event.type === 'assistant/message') {
      const data = event.data || {};
      if (currentTurn) {
        currentTurn.assistant = extractText(data.message?.content);
      }
    } else if (event.type === 'tool/call') {
      if (currentTurn) {
        currentTurn.actions = currentTurn.actions || [];
        currentTurn.actions.push({
          name: event.data?.name,
          args: event.data?.arguments,
        });
      }
    }
  }
  
  if (currentTurn) turns.push(currentTurn);
  
  // 只返回有内容的轮次
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

export default plugin;
export { MnemosynePlugin, extractTurns };
