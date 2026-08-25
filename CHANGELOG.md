# 变更日志

所有重要变更将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.4.0] - 2025-08-25

### 新增
- **Hindsight 架构对齐**：完整对标 Hindsight coding-agents 集成架构
- **Recall 模式**：支持 `guided` 和 `routingGuidance` 两种检索模式
- **Writeback 策略**：支持 `guided`（智能检测）和 `automatic` 两种回写模式
- **Idle Review**：30秒空闲自动触发反思（idleReviewMs）
- **Mental Models**：概念聚类生成，自动提取抽象模式和核心思想
- **决策检测**：智能识别决策关键词，提升重要性权重
- **工具调用记录**：记录重要工具操作（edit/write/bash/subagent）

### 改进
- **plugin.js**：生命周期管理增强，支持更精细的上下文注入
- **core.js**：配置扩展，Hindsight 兼容性参数
- **tools.js**：mnemo_recall 添加 mode 参数，mnemo_diagnose 添加兼容性检查
- **cordis.patch.yml**：完整配置示例，对标 Hindsight DSH 集成

### 工具更新
- `mnemo_recall` — 新增 `mode` 参数（guided/routingGuidance）
- `mnemo_diagnose` — 新增 Hindsight 兼容性检查
- `mnemo_clustering` — Mental Models 概念聚类（已存在）

### 配置示例
```yaml
# cordis.patch.yml 配置
- config:
    defaultRecallLimit: 10
    displayMode: sidebar
    idleReviewMs: 30000
    lifecycleEnabled: true
    recallMode: guided
    remoteAccess: read-only
    routingGuidance: true
    tabEnabled: true
    timeoutMs: 10000
    writeEnabled: true
    writebackMode: guided
  id: mnemon
  name: dsh-mnemon
```

## [1.3.0] - 2025-08-25

### 新增
- **向量语义搜索**：支持 OpenAI、Gemini、DeepSeek、Ollama、Agnes AI 等多提供商
- **LLM 深度反思**：自动从对话中提取决策、洞察和惯例（支持 LLM/启发式双模式）
- **代码库测绘**：自动识别 30+ 项目配置文件，生成技术栈摘要
- **跨会话回溯导入**：从 DSH 历史会话日志提取记忆并去重导入
- **共享记忆**：多 workspace 可指向同一 bank 文件
- **Delta 页面刷新**：知识页面增量更新，避免全量重建

### 工具
- `mnemo_recall` — 语义检索（支持向量/关键词双模式）
- `mnemo_store` — 存储记忆事件
- `mnemo_reflect` — 触发 LLM/启发式反思
- `mnemo_pages_list` — 列出知识页面
- `mnemo_pages_read` — 读取知识页面
- `mnemo_git_seed` — 导入 Git 历史
- `mnemo_import_history` — 跨会话回溯导入 ⭐新增
- `mnemo_pages_diff` — 查看页面变更 diff ⭐新增
- `mnemo_pages_delta` — 增量更新页面 ⭐新增
- `mnemo_stats` — 获取统计信息
- `mnemo_diagnose` — 诊断工具状态

### 配置
- 支持环境变量 `MNEMOSYNE_EMBEDDING_API_KEY` 和 `MNEMOSYNE_REFLECT_API_KEY`
- 支持 `config/mnemosyne.json` 配置文件

## [1.2.0] - 2025-08-20

### 新增
- 初始版本发布
- 核心记忆系统（长期记忆 + 工作记忆）
- 会话反思（启发式规则提取）
- 知识页面自动生成
- Git 历史导入种子

---

## 版本说明

- **大版本**：不兼容的 API 变更
- **中版本**：新增功能，保持向后兼容
- **小版本**：bug 修复和性能优化
