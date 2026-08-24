/**
 * Mnemosyne DSH Tools - 对标 Hindsight 的 hindsight_* 工具集
 *
 * 工具列表：
 * - mnemo_recall: 语义检索记忆
 * - mnemo_store: 存储记忆事件
 * - mnemo_reflect: 触发自动反思
 * - mnemo_pages_list: 列出知识页面
 * - mnemo_pages_read: 读取知识页面
 * - mnemo_git_seed: 导入 Git 历史
 * - mnemo_import_history: 跨会话回溯导入
 * - mnemo_stats: 获取记忆统计
 * - mnemo_diagnose: 诊断工具状态
 */

import { defineToolSafe as defineTool } from '../tool-util.js';

/**
 * 注册所有 Mnemosyne 工具到 DSH
 * @param {Object} tools - DSH tools 注册表
 * @param {Object} plugin - MnemosynePlugin 实例
 */
export function registerMnemosyneTools(tools, plugin) {
  
  // 1. mnemo_recall - 检索记忆
  tools.register(defineTool({
    name: 'mnemo_recall',
    description: '从 Mnemosyne 记忆系统中检索与查询相关的历史记忆。支持语义搜索、角色过滤和时间范围限定，帮助AI回顾项目决策上下文和技术选型历史。',
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: '搜索查询（自然语言）' },
        workspace: { type: 'string', description: '工作目录（可选，默认当前cwd）' },
        k: { type: 'number', minimum: 1, maximum: 30, default: 5, description: '返回数量' },
        min_importance: { type: 'number', minimum: 0, maximum: 1, default: 0 },
        role: { type: 'string', description: '限定角色（git/agent/reflection/...）' },
      }
    },
    execute: async ({ query, workspace, k, min_importance, role }) => {
      const wsRoot = workspace || process.cwd();
      const results = await plugin.recall(wsRoot, query, {
        k: k || 5,
        minImportance: min_importance || 0,
        role,
      });
      return { query, count: results.length, memories: results };
    }
  }));

  // 2. mnemo_store - 存储记忆
  tools.register(defineTool({
    name: 'mnemo_store',
    description: '记录一个项目事件到 Mnemosyne 记忆系统。适用于记录技术决策、架构变更、重要发现等需要长期记忆的内容。',
    parameters: {
      type: 'object',
      required: ['type', 'content'],
      properties: {
        type: {
          type: 'string',
          enum: ['decision', 'insight', 'commit', 'initiative', 'convention', 'review'],
          description: '事件类型'
        },
        content: { type: 'string', description: '事件内容' },
        workspace: { type: 'string', description: '工作目录' },
        role: { type: 'string', description: '记录角色' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签' },
        importance: { type: 'number', minimum: 0, maximum: 1, description: '重要性' },
      }
    },
    execute: async ({ type, content, workspace, role, tags, importance }) => {
      const wsRoot = workspace || process.cwd();
      const memoryId = plugin.remember(wsRoot, {
        type, content, role, tags, importance,
        source: 'tool:mnemo_store'
      });
      return { memory_id: memoryId, type, content, message: '记忆已存储' };
    }
  }));

  // 3. mnemo_reflect - 触发反思
  tools.register(defineTool({
    name: 'mnemo_reflect',
    description: '对当前会话进行深度反思，提取决策模式和知识洞察，并更新知识页面。适用于长会话后的知识沉淀。',
    parameters: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: '工作目录' },
        turns: { type: 'array', description: '会话轮次（可选，自动从session读取）' },
        force: { type: 'boolean', default: false, description: '强制执行' },
      }
    },
    execute: async ({ workspace, turns, force }) => {
      const wsRoot = workspace || process.cwd();
      const result = await plugin.reflect(wsRoot, turns || []);
      return { ...result, message: `反思完成：新增 ${result.insights_added} 条洞察，巩固 ${result.consolidated} 条记忆` };
    }
  }));

  // 4. mnemo_pages_list - 列出知识页面
  tools.register(defineTool({
    name: 'mnemo_pages_list',
    description: '列出当前项目的知识页面 — 架构、惯例、进行中项目等持久化摘要。在开始非平凡任务前调用，了解项目已有认知。',
    parameters: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: '工作目录' },
      }
    },
    execute: async ({ workspace }) => {
      const wsRoot = workspace || process.cwd();
      const pages = plugin.listPages(wsRoot);
      return { count: pages.length, pages };
    }
  }));

  // 5. mnemo_pages_read - 读取知识页面
  tools.register(defineTool({
    name: 'mnemo_pages_read',
    description: '读取指定知识页面的完整内容。在修改相关子系统前调用，避免重复理解。',
    parameters: {
      type: 'object',
      required: ['page_id'],
      properties: {
        page_id: { type: 'string', description: '页面ID（从 list 获取）' },
        workspace: { type: 'string', description: '工作目录' },
      }
    },
    execute: async ({ page_id, workspace }) => {
      const wsRoot = workspace || process.cwd();
      const page = plugin.readPage(wsRoot, page_id);
      if (!page) return { error: `页面不存在: ${page_id}` };
      return page;
    }
  }));

  // 6. mnemo_git_seed - 导入Git历史
  tools.register(defineTool({
    name: 'mnemo_git_seed',
    description: '从 Git 历史记录中导入 commit messages 作为记忆种子。适用于新项目首次初始化记忆库。',
    parameters: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: '工作目录' },
        limit: { type: 'number', default: 300, description: '最多导入commit数' },
      }
    },
    execute: async ({ workspace, limit }) => {
      const wsRoot = workspace || process.cwd();
      const result = await plugin.seedGit(wsRoot, limit || 300);
      return result;
    }
  }));

  // 7. mnemo_import_history - 跨会话回溯导入
  tools.register(defineTool({
    name: 'mnemo_import_history',
    description: '扫描 DSH 历史会话日志，解析用户/助手轮次，去重后导入当前工作空间的记忆库。适用于跨会话知识沉淀和回溯。',
    parameters: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: '目标工作目录' },
        sessionsRoot: { type: 'string', description: 'DSH sessions 目录（默认 ~/.dsh/sessions）' },
        maxSessions: { type: 'number', default: 50, description: '最多处理会话数' },
        dedupThreshold: { type: 'number', default: 0.8, description: '去重阈值（0-1）' },
        dryRun: { type: 'boolean', default: false, description: '预览模式，不写盘' },
      }
    },
    execute: async ({ workspace, sessionsRoot, maxSessions, dedupThreshold, dryRun }) => {
      const wsRoot = workspace || process.cwd();
      const { importHistory, listAvailableSessions } = await import('./import-history.js');

      if (dryRun) {
        return {
          preview: listAvailableSessions(sessionsRoot, { limit: maxSessions }),
          note: 'dryRun 模式：未执行实际导入'
        };
      }

      return await importHistory(wsRoot, {
        sessionsRoot,
        maxSessions: maxSessions || 50,
        dedupThreshold: dedupThreshold || 0.8,
        dryRun: false,
        plugin,
      });
    }
  }));

  // 8. mnemo_pages_diff - 查看页面变更
  tools.register(defineTool({
    name: 'mnemo_pages_diff',
    description: '查看当前工作空间的知识页面变更情况（新增/修改/删除）。适用于检查记忆系统状态变化。',
    parameters: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: '工作目录' },
      }
    },
    execute: async ({ workspace }) => {
      const wsRoot = workspace || process.cwd();
      const diff = plugin.pagesDiff(wsRoot);
      return {
        added: diff.added,
        modified: diff.modified,
        deleted: diff.deleted,
        unchanged: diff.unchanged,
        changes: diff.diffs.map(d => ({
          id: d.id,
          action: d.action,
          title: d.new?.title || d.old?.title || d.page?.title,
        })),
      };
    }
  }));

  // 9. mnemo_pages_delta - 增量更新页面
  tools.register(defineTool({
    name: 'mnemo_pages_delta',
    description: '增量更新知识页面，只保存有变化的部分，提高效率。',
    parameters: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: '工作目录' },
      }
    },
    execute: async ({ workspace }) => {
      const wsRoot = workspace || process.cwd();
      const diff = plugin.updatePagesDelta(wsRoot);
      return {
        message: `页面更新完成：新增 ${diff.added.length} 个，修改 ${diff.modified.length} 个，删除 ${diff.deleted.length} 个`,
        added: diff.added,
        modified: diff.modified,
        deleted: diff.deleted,
      };
    }
  }));

  // 7. mnemo_stats - 统计信息
  tools.register(defineTool({
    name: 'mnemo_stats',
    description: '获取当前工作空间的记忆统计信息。',
    parameters: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: '工作目录' },
      }
    },
    execute: async ({ workspace }) => {
      const wsRoot = workspace || process.cwd();
      return plugin.getStats(wsRoot);
    }
  }));

  // 8. mnemo_diagnose - 诊断
  tools.register(defineTool({
    name: 'mnemo_diagnose',
    description: '报告 Mnemosyne 运行时诊断信息：配置、工作空间、记忆状态。用于排查记忆功能异常。',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      const config = plugin.config;
      const workspace = process.cwd();
      const stats = plugin.getStats(workspace);
      return {
        enabled: config.enabled,
        workspace,
        stats,
        config: {
          apiUrl: config.apiUrl,
          reflectTimeoutMs: config.reflectTimeoutMs,
          gitIngest: config.gitIngest,
          autoReflect: config.autoReflect,
        }
      };
    }
  }));
}

/** 工具名称列表（供测试和文档使用） */
export const MNEMOSYNE_TOOLS = [
  'mnemo_recall',
  'mnemo_store',
  'mnemo_reflect',
  'mnemo_pages_list',
  'mnemo_pages_read',
  'mnemo_git_seed',
  'mnemo_import_history',
  'mnemo_pages_diff',
  'mnemo_pages_delta',
  'mnemo_stats',
  'mnemo_diagnose',
];
