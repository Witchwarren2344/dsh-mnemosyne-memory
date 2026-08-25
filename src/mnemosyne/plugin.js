/**
 * Mnemosyne DSH Plugin Entry Point — Hindsight-Aligned
 * 
 * 对标 Hindsight coding-agents DSH 集成架构：
 * - Lifecycle: session-start → seedGit → pre-step recall → turn-stopping writeback → reflect
 * - Modes: recallMode (guided/routingGuidance), writebackMode (guided/automatic)
 * - Features: idleReviewMs, defaultRecallLimit, tabEnabled, routingGuidance
 * 
 * 生命周期：
 * - agent/session-start  → seedGit + 冷启动检查
 * - agent/pre-step       → guided recall + 知识页面注入
 * - agent/turn-stopping  → guided writeback + 自动反思
 * - agent/idle-review    → idleTimeoutMs 超时触发反思
 * - ctx.tools            → 注册 mnemo_* 工具集
 */

import { MnemosynePlugin } from './core.js';
import { registerMnemosyneTools, MNEMOSYNE_TOOLS } from './tools.js';

const PLUGIN_NAME = 'mnemosyne-memory';
const HARNESS = 'dsh';

// ─── 配置默认值（对标 Hindsight）─────────────────────────
const DEFAULT_LIFECYCLE = {
  defaultRecallLimit: 10,
  displayMode: 'sidebar',
  idleReviewMs: 30000,        // 30秒空闲触发反思
  lifecycleEnabled: true,
  recallMode: 'guided',       // 'guided' | 'routingGuidance'
  remoteAccess: 'read-only',
  routingGuidance: true,
  tabEnabled: true,
  timeoutMs: 10000,
  writeEnabled: true,
  writebackMode: 'guided',    // 'guided' | 'automatic'
};

/**
 * 获取工作空间根目录
 */
function getWorkspaceRoot(agent) {
  return agent?.session?.header?.cwd || process.cwd();
}

/**
 * 提取当前轮次的对话内容（用于 writeback）
 */
function extractCurrentTurn(agent) {
  const events = agent?.session?.events || [];
  const turns = extractTurns(events);
  // 返回最新一轮
  return turns[turns.length - 1] || null;
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
        actions: [],
      };
    } else if (event.type === 'assistant/message') {
      const data = event.data || {};
      if (currentTurn) {
        currentTurn.assistant = extractText(data.message?.content);
      }
    } else if (event.type === 'tool/call') {
      if (currentTurn) {
        currentTurn.actions.push({
          name: event.data?.name,
          args: event.data?.arguments,
        });
      }
    }
  }
  
  if (currentTurn) turns.push(currentTurn);
  return turns.filter(t => t.content || t.assistant || t.actions?.length > 0);
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
 * 构建记忆注入上下文（Hindsight 风格）
 */
function buildInjectionContext(memories, pages, config) {
  const parts = [];
  const recallMode = config?.recallMode || 'guided';
  
  // 1. 知识页面（始终注入清单）
  if (pages?.length > 0) {
    const pageList = pages.map(p => 
      `- [${p.id}] ${p.title}: ${p.description}`
    ).join('\n');
    parts.push(`## 知识页面 (Knowledge Pages)\n${pageList}`);
  }
  
  // 2. 相关记忆（根据 recallMode 调整注入方式）
  if (memories?.length > 0) {
    if (recallMode === 'routingGuidance') {
      // 路由引导模式：按类型分组
      const byType = {};
      for (const m of memories) {
        const type = m.event_type || 'unknown';
        if (!byType[type]) byType[type] = [];
        byType[type].push(m);
      }
      
      for (const [type, items] of Object.entries(byType)) {
        const header = type.charAt(0).toUpperCase() + type.slice(1);
        const lines = items.map(m => 
          `> ${m.content?.slice(0, 200)}${m.content?.length > 200 ? '...' : ''}`
        ).join('\n');
        parts.push(`## ${header}\n${lines}`);
      }
    } else {
      // 引导模式：简单列表
      const lines = memories.map(m => 
        `> 🧠 **${m.event_type}** (sim: ${m.similarity?.toFixed(2)}, imp: ${m.importance})\n> ${m.content?.slice(0, 300)}`
      ).join('\n\n');
      parts.push(`## 相关历史记忆 (Historical Memories)\n${lines}`);
    }
  }
  
  return parts.join('\n\n');
}

/**
 * DSH Cordis 插件定义
 */
export const plugin = {
  name: PLUGIN_NAME,
  description: 'Mnemosyne 记忆插件 - 对标 Hindsight Coding Agents，提供 per-workspace 长期记忆、自动反思、知识页面和 Git 历史导入',
  
  /**
   * 插件初始化
   */
  apply(ctx, config = {}) {
    // 合并配置（Hindsight 风格）
    const mergedConfig = {
      ...DEFAULT_LIFECYCLE,
      ...config,
      embedding: { ...MnemosynePlugin.config?.embedding, ...(config.embedding || {}) },
      reflect: { ...MnemosynePlugin.config?.reflect, ...(config.reflect || {}) },
    };
    
    // 初始化 Mnemosyne 核心
    MnemosynePlugin.init(mergedConfig);
    
    // 注册工具
    registerMnemosyneTools(ctx.tools, MnemosynePlugin);
    console.log(`[Mnemosyne] 工具已注册: ${MNEMOSYNE_TOOLS.join(', ')}`);
    
    // 绑定生命周期事件
    bindLifecycle(ctx, mergedConfig);
    
    return plugin;
  }
};

/**
 * 绑定 Cordis 生命周期事件
 */
function bindLifecycle(ctx, config) {
  const {
    defaultRecallLimit = 10,
    idleReviewMs = 30000,
    recallMode = 'guided',
    writebackMode = 'guided',
    pageRefreshEveryTurns = 10,
    autoReflect = true,
  } = config;
  
  // 用于跟踪空闲时间
  const idleTimers = new Map();
  
  // 1. Session Start: 冷启动检查 + Git 种子
  ctx.on('agent/session-start', async ({ agent }) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (!workspaceRoot) return;
    
    const ws = MnemosynePlugin.getWorkspace(workspaceRoot);
    
    // 冷启动：检查是否需要 Git 种子
    if (!ws.seeded) {
      ws.seeded = true;
      console.log(`[Mnemosyne] Session start: ${workspaceRoot} - 启动 Git 种子...`);
      
      // 后台启动种子（不阻塞 session 打开）
      MnemosynePlugin.seedGit(workspaceRoot, 100).then(result => {
        console.log(`[Mnemosyne] Git 种子完成: ${result.seeded} 条 commits 导入`);
      }).catch(err => {
        console.warn('[Mnemosyne] Git 种子失败:', err.message);
      });
    }
    
    // 重置空闲计时器
    resetIdleTimer(workspaceRoot, idleReviewMs, ctx);
  });
  
  // 2. Pre-Step: 检索相关记忆并注入上下文（Hindsight guided recall）
  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (!workspaceRoot) return next();

    const ws = MnemosynePlugin.getWorkspace(workspaceRoot);
    ws.turnCount = (ws.turnCount || 0) + 1;

    // 重置空闲计时器（用户有活动）
    resetIdleTimer(workspaceRoot, idleReviewMs, ctx);

    try {
      // 从当前 prompt 提取查询
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

      // 检索相关记忆（Hindsight 风格：guided recall）
      const k = defaultRecallLimit || 10;
      const recallResult = await MnemosynePlugin.recall(workspaceRoot, query, {
        k,
        minImportance: 0.2,
        mode: recallMode,
      });

      // 提取 memories 数组（兼容新旧格式）
      const memories = recallResult?.results || recallResult || [];

      // 获取知识页面（定期刷新）
      const shouldRefresh = ws.turnCount % pageRefreshEveryTurns === 1;
      const pages = shouldRefresh ? MnemosynePlugin.listPages(workspaceRoot) : [];

      if (memories.length === 0 && pages.length === 0) {
        return next();
      }

      // 构建注入上下文
      const injection = buildInjectionContext(memories, pages, config);

      // 调用下一个处理器
      const decision = await next();

      // 将注入注入到下一轮
      if (decision && decision.kind === 'enter') {
        decision.messages = decision.messages || [];
        decision.messages.unshift({
          role: 'user',
          content: [{ type: 'text', text: injection }],
          source: { kind: 'plugin', plugin: PLUGIN_NAME },
        });
      }

      return decision;

    } catch (err) {
      console.warn(`[Mnemosyne] pre-step 注入失败:`, err.message);
      return next();
    }
  }, { prepend: true });
  
  // 3. Turn Stopping: 会话回写 + 自动反思（Hindsight 风格）
  ctx.on('agent/turn-stopping', async ({ agent }) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (!workspaceRoot) return;

    const ws = MnemosynePlugin.getWorkspace(workspaceRoot);
    ws.turnCount = (ws.turnCount || 0) + 1;

    // 提取当前轮次的对话
    const turns = extractTurns(agent?.session?.events || []);
    const latestTurn = turns[turns.length - 1];

    if (!latestTurn) return;

    // 保存最近轮次用于 idle review
    ws.recentTurns = turns.slice(-5);

    // 回写策略（根据 writebackMode）
    if (writebackMode === 'guided') {
      // 引导模式：只回写重要内容
      const content = latestTurn.assistant || latestTurn.content || '';
      if (content.length > 50) {
        // 检测是否包含决策关键词
        const decisionKeywords = ['决定', '决策', '选择', '采用', '放弃', '最终', '结论', '建议', '方案', '架构'];
        const hasDecision = decisionKeywords.some(kw => content.includes(kw));

        // 检测技术关键词
        const techKeywords = ['框架', '库', '依赖', '技术方案', '架构', '使用', '引入', '实现'];
        const hasTech = techKeywords.some(kw => content.includes(kw));

        MnemosynePlugin.remember(workspaceRoot, {
          type: hasDecision ? 'decision' : (hasTech ? 'insight' : 'session_turn'),
          content: content.slice(0, 500),
          role: 'agent',
          tags: ['session', `turn-${ws.turnCount}`, hasDecision ? 'decision' : 'general'],
          importance: hasDecision ? 0.85 : (hasTech ? 0.7 : 0.3),
          source: 'session-writeback',
        });
      }

      // 回写工具调用（如果有）
      if (latestTurn.actions?.length > 0) {
        const importantActions = latestTurn.actions.filter(a =>
          ['edit', 'write', 'bash', 'subagent'].includes(a.name)
        );
        if (importantActions.length > 0) {
          MnemosynePlugin.remember(workspaceRoot, {
            type: 'tool_usage',
            content: `工具调用: ${importantActions.map(a => a.name).join(', ')}`,
            role: 'agent',
            tags: ['session', 'tools', `turn-${ws.turnCount}`],
            importance: 0.4,
            source: 'session-writeback',
          });
        }
      }
    } else {
      // 自动模式：回写所有轮次
      for (const turn of turns.slice(-3)) {  // 只回写最近3轮
        const content = turn.assistant || turn.content || '';
        if (content.length > 20) {
          MnemosynePlugin.remember(workspaceRoot, {
            type: 'session_turn',
            content: `${turn.role}: ${content.slice(0, 300)}`,
            role: turn.role === 'assistant' ? 'agent' : 'user',
            tags: ['session', `turn-${ws.turnCount}`],
            importance: 0.3,
            source: 'session-writeback',
          });
        }
      }
    }
    
    // 自动反思触发（每 5 轮或达到 idleTimeout）
    if (autoReflect && ws.turnCount % 5 === 0) {
      MnemosynePlugin.reflect(workspaceRoot, turns).catch(err => {
        console.warn('[Mnemosyne] 反思失败:', err.message);
      });
    }
  });
  
  // 4. Agent Disposed: 清理
  ctx.on('agent/disposed', ({ agent }) => {
    const workspaceRoot = getWorkspaceRoot(agent);
    if (workspaceRoot) {
      // 清除空闲计时器
      const timer = idleTimers.get(workspaceRoot);
      if (timer) {
        clearTimeout(timer);
        idleTimers.delete(workspaceRoot);
      }
      MnemosynePlugin.dispose(workspaceRoot);
    }
  });
}

/**
 * 重置空闲计时器
 */
function resetIdleTimer(workspaceRoot, idleReviewMs, ctx) {
  // 清除旧计时器
  const oldTimer = idleTimers.get(workspaceRoot);
  if (oldTimer) clearTimeout(oldTimer);
  
  // 设置新计时器
  if (idleReviewMs > 0) {
    const timer = setTimeout(async () => {
      idleTimers.delete(workspaceRoot);
      try {
        const ws = MnemosynePlugin.getWorkspace(workspaceRoot);
        const turns = ws?.recentTurns || [];
        if (turns.length > 0) {
          console.log(`[Mnemosyne] Idle review triggered for ${workspaceRoot}`);
          await MnemosynePlugin.reflect(workspaceRoot, turns);
        }
      } catch (err) {
        console.warn('[Mnemosyne] Idle review failed:', err.message);
      }
    }, idleReviewMs);
    
    idleTimers.set(workspaceRoot, timer);
  }
}

export default plugin;
export { MnemosynePlugin, extractTurns, extractText, buildInjectionContext };
