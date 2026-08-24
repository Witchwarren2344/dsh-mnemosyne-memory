# Mnemosyne Plugin Type Declarations - Core

export interface EmbeddingConfig {
  enabled: boolean;
  provider: 'openai' | 'gemini' | 'deepseek' | 'ollama' | 'agnes';
  model: string;
  dimensions: number;
  apiKey: string;
  endpoint?: string;
}

export interface ReflectConfig {
  enabled: boolean;
  provider: 'openai' | 'gemini' | 'deepseek' | 'ollama' | 'agnes';
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  apiKey: string;
  endpoint?: string;
}

export interface MnemosyneConfig {
  enabled: boolean;
  embedding: EmbeddingConfig;
  reflect: ReflectConfig;
  sharedBanks: Record<string, string>;
  pageRefreshEveryTurns: number;
}

export interface MemoryEntry {
  id: string;
  event_type: string;
  content: string;
  tags: string[];
  importance: number;
  role: string;
  workspace: string;
  created_at: string;
  updated_at: string;
  vector?: number[];
}

export interface RecallResult {
  id: string;
  event_type: string;
  content: string;
  similarity: number;
  search_method: 'vector' | 'keyword';
  tags?: string[];
  importance?: number;
}

export interface KnowledgePage {
  id: string;
  title: string;
  description: string;
  content: string;
  updated_at: string;
}

export interface ReflectResult {
  insights_added: number;
  consolidated: number;
  method: 'llm' | 'heuristic';
}

export interface PluginStats {
  longTermCount: number;
  workingCount: number;
  pageCount: number;
}

export interface WorkspaceState {
  bank: any;
  turnCount: number;
  lastReflectTurn: number;
  seeded: boolean;
}

declare class MnemosynePlugin {
  static init(config?: Partial<MnemosyneConfig>): MnemosynePlugin;
  static getWorkspace(root: string): WorkspaceState;
  static remember(root: string, event: {
    type: string;
    content: string;
    tags?: string[];
    importance?: number;
    role?: string;
    source?: string;
  }): Promise<string>;
  static recall(root: string, query: string, options?: {
    k?: number;
    minImportance?: number;
    role?: string;
  }): Promise<RecallResult[]>;
  static reflect(root: string, turns?: Array<{
    role: string;
    content?: string;
    assistant?: string;
  }>): Promise<ReflectResult>;
  static configureSharedBank(workspaceRoot: string, bankPath: string): void;
  static listPages(root: string): KnowledgePage[];
  static readPage(root: string, pageId: string): KnowledgePage;
  static pagesDiff(root: string): Array<{
    type: 'added' | 'modified' | 'deleted';
    page_id: string;
    title: string;
  }>;
  static updatePagesDelta(root: string): void;
  static seedGit(root: string, limit?: number): Promise<void>;
  static importHistory(root: string, options?: {
    limit?: number;
    dryRun?: boolean;
  }): Promise<{ imported: number; skipped_duplicates: number; errors: string[] }>;
  static dispose(root: string): void;
  static getStats(root: string): PluginStats;
  config: MnemosyneConfig;
}

export { MnemosynePlugin };
export default MnemosynePlugin;
