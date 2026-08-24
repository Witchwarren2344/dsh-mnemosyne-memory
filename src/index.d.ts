/**
 * Mnemosyne DSH Plugin - Type Declarations
 * 
 * @module mnemosyne-memory
 */

/**
 * 记忆条目结构
 */
export interface Memory {
  id: string;
  role: string;
  event_type: string;
  content: string;
  tags: string[];
  importance: number;
  source: string;
  created_at: string;
  vector?: number[];
}

/**
 * 知识页面结构
 */
export interface KnowledgePage {
  id: string;
  title: string;
  content: string;
  updated: string;
}

/**
 * 检索结果
 */
export interface RecallResult {
  memory_id: string;
  event_type: string;
  content: string;
  role: string;
  importance: number;
  timestamp: number;
  similarity: number;
  tags: string[];
  search_method: 'vector' | 'keyword';
}

/**
 * 插件配置
 */
export interface PluginConfig {
  enabled: boolean;
  apiUrl?: string;
  apiToken?: string;
  reflectTimeoutMs?: number;
  autoReflect?: boolean;
  gitIngest?: 'message' | 'full' | 'none';
  maxParallelRetains?: number;
  bankIdTemplate?: string;
  observationScopes?: string;
  retainSessions?: boolean;
  pageRefreshEveryTurns?: number;
  sharedBanks?: Record<string, string>;
  embedding?: {
    enabled: boolean;
    provider: 'openai' | 'deepseek' | 'agnes' | 'gemini';
    model: string;
    dimensions: number;
    apiKey: string | null;
    endpoint: string | null;
  };
  reflect?: {
    enabled: boolean;
    provider: 'openai' | 'deepseek' | 'agnes' | 'gemini';
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    apiKey: string | null;
    endpoint: string | null;
  };
}

/**
 * 反思结果
 */
export interface ReflectResult {
  insights_added: number;
  consolidated: number;
  method: 'llm' | 'heuristic';
}

/**
 * Git 种子结果
 */
export interface GitSeedResult {
  seeded?: number;
  total?: number;
  error?: string;
}

/**
 * 统计信息
 */
export interface Stats {
  longTermCount: number;
  workingCount: number;
  pageCount: number;
  avgImportance: string;
}

/**
 * Mnemosyne 插件核心类
 */
export class MnemosynePlugin {
  /** 插件配置 */
  config: PluginConfig;
  
  /**
   * 初始化插件
   * @param configOverride 配置覆盖
   */
  init(configOverride?: Partial<PluginConfig>): this;
  
  /**
   * 获取或创建工作空间
   * @param root 工作空间根目录
   */
  getWorkspace(root: string): { bank: { memories: Memory[], pages: KnowledgePage[], working: Memory[], meta: Record<string, any> }, turnCount: number, lastReflectTurn: number };
  
  /**
   * 存储记忆
   * @param workspaceRoot 工作空间根目录
   * @param event 记忆事件
   */
  remember(workspaceRoot: string, event: {
    type: string;
    content: string;
    role?: string;
    tags?: string[];
    importance?: number;
    source?: string;
    context?: Record<string, any>;
  }): Promise<string>;
  
  /**
   * 检索记忆
   * @param workspaceRoot 工作空间根目录
   * @param query 查询字符串
   * @param options 检索选项
   */
  recall(workspaceRoot: string, query: string, options?: {
    k?: number;
    minImportance?: number;
    role?: string;
  }): Promise<RecallResult[]>;
  
  /**
   * 触发反思
   * @param workspaceRoot 工作空间根目录
   * @param turns 对话轮次
   */
  reflect(workspaceRoot: string, turns?: any[]): Promise<ReflectResult>;
  
  /**
   * 配置共享 bank
   * @param workspaceRoot 工作空间根目录
   * @param bankPath bank 路径
   */
  configureSharedBank(workspaceRoot: string, bankPath: string): void;
  
  /**
   * 获取知识页面
   * @param workspaceRoot 工作空间根目录
   */
  getPages(workspaceRoot: string): KnowledgePage[];
  
  /**
   * 列出所有页面
   * @param workspaceRoot 工作空间根目录
   */
  listPages(workspaceRoot: string): Array<{ id: string; title: string; description: string }>;
  
  /**
   * 读取单个页面
   * @param workspaceRoot 工作空间根目录
   * @param pageId 页面 ID
   */
  readPage(workspaceRoot: string, pageId: string): KnowledgePage | null;
  
  /**
   * 计算页面变更 diff
   * @param workspaceRoot 工作空间根目录
   */
  pagesDiff(workspaceRoot: string): {
    added: string[];
    modified: string[];
    deleted: string[];
    unchanged: string[];
    diffs: Array<{ id: string; action: 'added' | 'modified' | 'deleted'; old?: KnowledgePage; new?: KnowledgePage; page?: KnowledgePage }>;
    newPages: KnowledgePage[];
  };
  
  /**
   * 增量更新知识页面
   * @param workspaceRoot 工作空间根目录
   */
  updatePagesDelta(workspaceRoot: string): {
    added: string[];
    modified: string[];
    deleted: string[];
  };
  
  /**
   * 导入 Git 历史
   * @param workspaceRoot 工作空间根目录
   * @param limit 最多导入 commit 数
   */
  seedGit(workspaceRoot: string, limit?: number): Promise<GitSeedResult>;
  
  /**
   * 导入历史会话
   * @param workspaceRoot 工作空间根目录
   * @param options 导入选项
   */
  importHistory(workspaceRoot: string, options?: {
    sessionsRoot?: string;
    maxSessions?: number;
    dedupThreshold?: number;
    maxContentLength?: number;
    dryRun?: boolean;
  }): Promise<any>;
  
  /**
   * 清除工作空间
   * @param workspaceRoot 工作空间根目录
   */
  dispose(workspaceRoot: string): void;
  
  /**
   * 获取统计信息
   * @param workspaceRoot 工作空间根目录
   */
  getStats(workspaceRoot: string): Stats;
}

/**
 * DSH Cordis 插件定义
 */
export const plugin: {
  name: string;
  description: string;
  apply(ctx: any, config?: PluginConfig): any;
};

/**
 * 注册 Mnemosyne 工具到 DSH
 * @param tools DSH tools 注册表
 * @param plugin MnemosynePlugin 实例
 */
export function registerMnemosyneTools(tools: any, plugin: MnemosynePlugin): void;

/**
 * Mnemosyne 工具名称列表
 */
export const MNEMOSYNE_TOOLS: string[];

/**
 * 测绘工作空间
 * @param workspaceRoot 工作空间根目录
 */
export function surveyWorkspace(workspaceRoot: string): {
  success: boolean;
  report: any;
  summary: {
    languages: string[];
    frameworkCount: number;
    fileCount: number;
    dirCount: number;
  };
};

/**
 * 将测绘结果写入 Mnemosyne 记忆系统
 * @param workspaceRoot 工作空间根目录
 * @param plugin MnemosynePlugin 实例
 */
export function saveSurveyToMemory(workspaceRoot: string, plugin: MnemosynePlugin): Promise<any>;

/**
 * 导入历史会话
 * @param workspaceRoot 工作空间根目录
 * @param options 导入选项
 */
export function importHistory(workspaceRoot: string, options?: {
  sessionsRoot?: string;
  maxSessions?: number;
  dedupThreshold?: number;
  maxContentLength?: number;
  dryRun?: boolean;
  plugin?: MnemosynePlugin;
}): Promise<any>;

/**
 * 列出可用的历史会话
 * @param rootDir DSH sessions 目录
 * @param options 选项
 */
export function listAvailableSessions(rootDir?: string, options?: {
  limit?: number;
  format?: 'summary' | 'full';
}): {
  total: number;
  sessions: Array<{ sessionId: string; path: string; size: number; mtime: string }>;
};
