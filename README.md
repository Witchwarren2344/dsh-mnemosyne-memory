# Mnemosyne Memory Plugin for DSH

**Mnemosyne 永久记忆插件** — 为 DeepSeek Harness (DSH) 提供长期记忆、向量语义搜索和 LLM 反思功能

[Mnemosyne Memory Plugin](#readme) | [中文说明](#项目简介)

---

[![npm version](https://img.shields.io/badge/npm-1.3.0-blue)](https://www.npmjs.com/package/dsh-mnemosyne-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-orange)](https://github.com/deepseek-ai/deepseek-harness)
[![Cordis](https://img.shields.io/badge/Cordis-Compatible-6d28d9)](https://github.com/deepseek-ai/cordis)

---

## 📖 Project Overview | 项目简介

**Mnemosyne** is a permanent memory plugin for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness), providing **cross-session long-term memory capabilities** for AI Agents.

**Mnemosyne** 是 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 的永久记忆插件，为 AI Agent 提供**跨会话的长期记忆能力**。

### Core Value | 核心价值

| Value | 价值 | Description | 说明 |
|-------|------|-------------|------|
| 🧠 Permanent Memory | 永久记忆 | Persist memory across sessions and restarts | 记忆持久化存储，跨会话、跨重启不丢失 |
| 🔍 Semantic Search | 语义检索 | Vector-based semantic understanding and retrieval | 支持向量语义搜索，理解自然语言查询 |
| 🤖 LLM Reflection | LLM 反思 | Auto-extract decisions, insights, and conventions | 自动从会话中提取决策、洞察和惯例 |
| 📄 Knowledge Pages | 知识页面 | Auto-generate architecture, conventions, projects | 自动生成架构图、惯例清单、项目摘要 |
| 🔧 Codebase Survey | 代码测绘 | Identify 30+ config patterns automatically | 识别 30+ 配置文件模式，自动索引 |
| 🌐 Cross-Session | 跨会话回溯 | Import historical sessions to inherit knowledge | 导入历史会话，继承已有知识 |
| 👥 Multi-Workspace | 多 Workspace | Isolated per project, shared memory supported | 按项目隔离，支持团队共享记忆 |
| ⚡ Delta Refresh | Delta 刷新 | Incremental updates, only changed pages refresh | 只更新有变化的页面，高效同步 |

### Supported AI Providers | 支持的 AI 提供商

| Provider | 提供商 | Embedding Model | 嵌入模型 | Dimensions | 维度 | Free Tier | 免费额度 |
|----------|--------|-----------------|----------|------------|------|-----------|---------|
| **Gemini** | Gemini | gemini-embedding-001 | gemini-embedding-001 | 768 | 768 | ✅ 1500/day | 每天 1500 次 |
| **OpenAI** | OpenAI | text-embedding-3-small/large | text-embedding-3-small/large | 1536/3072 | 1536/3072 | ⚠️ Pay per use | 按量付费 |
| **DeepSeek** | DeepSeek | deepseek-embedding | deepseek-embedding | 2048 | 2048 | ⚠️ New users | 新用户送额度 |
| **Ollama** | Ollama | nomic-embed-text / bge-large | nomic-embed-text / bge-large | 768/1024 | 768/1024 | ✅ Free | 完全免费 |
| **Agnes AI** | Agnes AI | agnes-embedding | agnes-embedding | 1536 | 1536 | ⚠️ New users | 新用户送额度 |

---

## ✨ Features | 功能特性

### 1. Vector Semantic Search | 向量语义搜索

Support multiple embedding models for semantic understanding and retrieval:
支持多种嵌入模型，实现基于语义的理解和检索：

```javascript
// 自然语言查询
const results = await mnemo_recall('上次我们决定用什么框架？');
// → Returns relevant memories sorted by semantic similarity
// → 返回相关记忆，按语义相似度排序
```

### 2. LLM-Driven Deep Reflection | LLM 驱动的深度反思

Automatically extract key information from conversations:
自动从会话中提取关键信息：

- **Decision Extraction** — 识别"决定"、"选择"、"采用"等关键词
- **Insight Generation** — 发现新模式、重复出现的问题
- **Convention Summarization** — 自动归纳开发惯例和最佳实践

### 3. Auto-Generated Knowledge Pages | 知识页面自动生成

Auto-generate three types of knowledge pages from memory data:
从记忆数据自动生成三类知识页面：

| Page Type | 页面类型 | Content | 内容 | Update Trigger | 更新时机 |
|-----------|----------|---------|------|----------------|----------|
| `architecture` | 架构 | Architecture decisions, tech stack | 架构决策、技术选型 | After each reflection | 每次反思后 |
| `conventions` | 惯例 | Development conventions, coding standards | 开发惯例、编码规范 | Delta refresh | Delta 刷新 |
| `initiatives` | 项目 | Ongoing projects, goal tracking | 进行中项目、目标追踪 | Manual/Auto | 手动/自动 |

### 4. Codebase Survey | 代码库测绘

Auto-identify and index 30+ configuration file patterns:
自动识别并索引 30+ 配置文件模式：

```
package.json / pom.xml / go.mod          # Dependency management
tsconfig.json / webpack.config.js         # Build configuration
.eslintrc / prettier.config.js           # Code style
Dockerfile / docker-compose.yml          # Container config
.github/workflows/                       # CI/CD
.env / .env.local                        # Environment variables
```

### 5. Cross-Session Memory Recall | 跨会话记忆回溯

Import historical sessions to inherit existing knowledge:
导入历史会话，继承已有知识：

```bash
# 从 DSH 自身会话导入
mnemo_import_history --limit 20

# 从 Claude Code 导入
mnemo_import claude --path ~/.claude/projects

# 从 ChatGPT 导出导入
mnemo_import chatgpt --path ./conversations.json
```

### 6. Multi-Workspace Shared Memory | 多 Workspace 共享记忆

Each project has isolated memory bank, supporting team sharing:
每个项目拥有独立的记忆银行，支持团队共享：

```
data/mnemosyne/
├── banks/
│   ├── project-x/memory.json    # Project X memory
│   ├── project-y/memory.json    # Project Y memory
│   └── shared/common.json       # Shared memory
```

### 7. Delta Page Refresh | Delta 页面刷新

Only update changed pages, avoiding full recalculation:
只更新有变化的页面，避免全量重算：

```javascript
const changes = await mnemo_pages_delta();
// → { added: 2, modified: 5, deleted: 0 }
```

---

## 📦 Installation | 安装方法

### Prerequisites | 前置要求

- Node.js >= 18.0.0
- DSH (DeepSeek Harness) >= 0.1.0-rc.7
- Git (for codebase survey)

### Installation Steps | 安装步骤

```bash
# Clone the repository
git clone https://github.com/fjzzwxp/dsh-mnemosyne-memory.git
cd dsh-mnemosyne-memory

# Install dependencies
npm install

# Method 1: Auto-install (Recommended)
./scripts/install.sh

# Method 2: Local symlink (Development mode)
./scripts/install.sh web --local

# Method 3: Manual registration
dsh plugin --profile web add $(pwd)
```

### Configure API Keys | 配置 API Key

```bash
# Copy config example
cp config/mnemosyne.json.example config/mnemosyne.json

# Edit config and add your API keys
nano config/mnemosyne.json
```

### Verify Installation | 验证安装

```bash
# Check plugin status
dsh plugin --profile web list

# Run diagnostics
dsh --profile web eval 'mnemo_diagnose()'

# Run tests
npm test
```

### Uninstall | 卸载

```bash
# Auto uninstall
./scripts/uninstall.sh

# Uninstall and clear data
./scripts/uninstall.sh web --data
```

---

## ⚙️ Configuration | 配置说明

### Environment Variables | 环境变量

```bash
# Basic config
export MNEMOSYNE_DATA_DIR=./data/mnemosyne
export MNEMOSYNE_ENABLED=true

# Embedding model config
export MNEMOSYNE_PROVIDER=gemini          # openai|gemini|deepseek|ollama|agnes
export MNEMOSYNE_EMBEDDING_MODEL=gemini-embedding-001
export MNEMOSYNE_EMBEDDING_DIMENSIONS=768

# API Keys
export GEMINI_API_KEY=your-key-here
export OPENAI_API_KEY=sk-xxx
export DEEPSEEK_API_KEY=sk-xxx

# Ollama local deployment
export MNEMOSYNE_PROVIDER=ollama
export MNEMOSYNE_EMBEDDING_MODEL=nomic-embed-text
export MNEMOSYNE_EMBEDDING_ENDPOINT=http://localhost:11434
```

### JSON Configuration | JSON 配置文件

```json
// config/mnemosyne.json
{
  "enabled": true,
  "embedding": {
    "enabled": true,
    "provider": "gemini",
    "model": "gemini-embedding-001",
    "dimensions": 768,
    "apiKey": "YOUR_API_KEY"
  },
  "reflect": {
    "enabled": true,
    "provider": "gemini",
    "model": "gemini-flash-lite-latest",
    "temperature": 0.3,
    "maxTokens": 2000,
    "apiKey": "YOUR_API_KEY"
  },
  "sharedBanks": {}
}
```

---

## 🛠️ Tools | 工具列表

11 `mnemo_*` tools provided:
提供 **11 个** `mnemo_*` 工具：

| Tool | 工具 | Function | 功能 | Parameters | 参数 |
|------|------|----------|------|------------|------|
| `mnemo_recall` | 检索 | Semantic search memories | 语义检索记忆 | query, k, role, min_importance |
| `mnemo_store` | 存储 | Store memory events | 存储记忆事件 | type, content, importance, tags |
| `mnemo_reflect` | 反思 | Trigger LLM/heuristic reflection | 触发 LLM 反思 | turns, force |
| `mnemo_pages_list` | 列表 | List knowledge pages | 列出知识页面 | - |
| `mnemo_pages_read` | 读取 | Read knowledge page | 读取知识页面 | page_id |
| `mnemo_pages_diff` | 差异 | View page change diff | 查看页面变更 diff | - |
| `mnemo_pages_delta` | 增量 | Incremental page update | 增量更新页面 | - |
| `mnemo_git_seed` | 种子 | Import Git history | 导入 Git 历史 | limit |
| `mnemo_import_history` | 导入 | Cross-session import | 跨会话导入 | limit, dryRun |
| `mnemo_stats` | 统计 | Get memory statistics | 获取统计信息 | - |
| `mnemo_diagnose` | 诊断 | Diagnose tool status | 诊断工具状态 | - |

---

## 📖 Usage Examples | 使用示例

### Store Memory | 存储记忆

```javascript
// Record a decision
await mnemo_store({
  type: 'decision',
  content: '决定优先开发客服 AI 场景',
  importance: 0.85,
  tags: ['战略', '客服']
});

// Record an insight
await mnemo_store({
  type: 'insight',
  content: '用户更偏好快速响应而非深度分析',
  importance: 0.75,
  tags: ['用户反馈', '体验']
});
```

### Recall Memory | 检索记忆

```javascript
// Semantic search
const results = await mnemo_recall({
  query: '我们之前决定用什么框架',
  k: 5,
  min_importance: 0.5
});

// Filter by role
const ceoInsights = await mnemo_recall({
  query: '战略方向',
  role: 'ceo',
  k: 10
});
```

### Trigger Reflection | 触发反思

```javascript
// Auto-reflect current session
const reflection = await mnemo_reflect({
  turns: 20,  // Analyze last 20 turns
  force: false
});

console.log('Extracted insights:', reflection.insights_added);
```

### Knowledge Pages | 知识页面

```javascript
// List all pages
const pages = await mnemo_pages_list();

// Read a page
const arch = await mnemo_pages_read({ page_id: 'architecture' });

// Incremental refresh
const delta = await mnemo_pages_delta();
// → { added: 2, modified: 5, deleted: 0 }
```

### Git History Import | Git 历史导入

```bash
# Import last 300 commits
mnemo_git_seed --limit 300

# Import from specific workspace
mnemo_git_seed --workspace /path/to/project --limit 500
```

### Cross-Session Import | 跨会话导入

```bash
# Preview (dry run)
mnemo_import_history --limit 10 --dry-run

# Import from DSH sessions
mnemo_import_history --limit 20
```

---

## 🔄 Automation | 自动化功能

Automatically triggered during DSH sessions:
在 DSH 会话中自动触发：

| Trigger | 触发时机 | Action | 动作 |
|---------|----------|--------|------|
| Session Start | 会话开始 | Codebase survey + Git seed | 代码库测绘 + Git 种子导入 |
| Every 5 turns | 每 5 轮 | Auto-reflect, extract decisions/insights | 自动反思，提取决策/洞察 |
| Every 10 turns | 每 10 轮 | Refresh knowledge pages | 刷新知识页面 |
| Pre-step | 步骤前 | Inject relevant memories | 注入相关历史记忆 |

---

## 📊 Comparison with Hindsight | 与 Hindsight 对比

| Feature | Hindsight | Mnemosyne | Notes | 说明 |
|---------|-----------|-----------|-------|------|
| **Memory Storage** | Per-repo JSON Bank | Per-workspace JSON Bank | Supports DSH multi-workspace | 支持 DSH 多工作区 |
| **Semantic Search** | Vector similarity | Vector + keyword hybrid | Multiple embedding models | 支持多种嵌入模型 |
| **LLM Reflection** | Lightweight heuristic | LLM-driven deep reflection | Extract complex patterns | 可提取更复杂模式 |
| **Knowledge Pages** | Auto-generated | Auto + Delta refresh | Incremental updates | 增量更新更高效 |
| **Codebase Survey** | None | 30+ config patterns | Enhanced context understanding | 增强上下文理解 |
| **Cross-Session** | None | Import historical sessions | Inherit existing knowledge | 继承已有知识 |
| **Multi-Workspace** | Per-repo | Per-workspace + shared | Flexible isolation/sharing | 灵活隔离/共享 |
| **AI Providers** | OpenAI only | 5 providers | More flexible choices | 更灵活的选择 |
| **Git Import** | Commit messages | Enhanced (with diff) | Richer context | 更丰富的上下文 |
| **Permissions** | None | Role isolation + importance weights | Enterprise security | 企业级安全 |
| **Local Offline** | ❌ | ✅ | No external dependency | 零外部依赖 |

---

## 🚀 Quick Start | 快速开始

```bash
# 1. Install
git clone https://github.com/fjzzwxp/dsh-mnemosyne-memory.git ~/.dsh/plugins/
cd ~/.dsh/plugins/dsh-mnemosyne-memory && npm install

# 2. Configure
cp config/mnemosyne.json.example config/mnemosyne.json
# Edit config/mnemosyne.json and add your Gemini API key

# 3. Install plugin
./scripts/install.sh

# 4. Start DSH
dsh --profile web
```

---

## 📝 License | 许可证

[MIT License](./LICENSE)

Copyright (c) 2025 [fjzzwxp](https://github.com/fjzzwxp)

---

## 👤 Author | 作者

**fjzzwxp** — [GitHub](https://github.com/fjzzwxp)

---

## 🔗 Links | 相关链接

- [DSH 官方文档](https://deepseek-harness.github.io/deepseek-harness/)
- [Hindsight 官方仓库](https://github.com/vectorize-io/hindsight)
- [Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- [CHANGELOG](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)
- [Testing](./TESTING.md)

---

## 🏷️ Topics | 标签

`dsh` `deepseek` `harness` `plugin` `memory` `mnemosyne` `vector-search` `semantic-search` `embedding` `llm` `hindsight` `cordis` `ai-agent` `long-term-memory` `knowledge-management` `git-import` `multi-workspace` `share-memory` `open-source` `typescript` `javascript` `nodejs`
# TODO: Add more tests
