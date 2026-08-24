# Mnemosyne Memory Plugin for DSH

**Mnemosyne 永久记忆插件** — 为 DeepSeek Harness (DSH) 提供长期记忆、向量语义搜索和 LLM 反思功能

[Mnemosyne Memory Plugin](#readme) | [中文说明](#项目简介)

---

[![npm version](https://img.shields.io/badge/npm-1.3.0-blue)](https://www.npmjs.com/package/dsh-mnemosyne-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-orange)](https://github.com/deepseek-ai/deepseek-harness)
[![Cordis](https://img.shields.io/badge/Cordis-Compatible-6d28d9)](https://github.com/deepseek-ai/cordis)
[![Free Software](https://img.shields.io/badge/免费-Free-green)](https://github.com/fjzzwxp/dsh-mnemosyne-memory)

---

## 🎉 完全免费 | 100% Free

> **Mnemosyne 是一款完全免费的开源插件，采用 MIT 许可证。**
>
> **Mnemosyne is a 100% free open-source plugin under the MIT License.**

| 项目 | Item | 费用 | Cost |
|------|------|------|------|
| 插件本体 | Plugin本体 | ✅ **完全免费** | **FREE** |
| 本地部署 | Local (Ollama) | ✅ **零成本** | **$0** |
| 云端 API | Cloud (Gemini/DeepSeek) | 可选升级 | Optional |

### 💡 两种使用方式 | Two Ways to Use

| 方式 | Approach | 成本 | 适用场景 |
|------|----------|------|----------|
| 🏠 **本地部署** | Local (Ollama) | 免费 | 隐私敏感、离线环境 |
| ☁️ **云端 API** | Cloud (Gemini/DeepSeek) | 可选 | 需要更高精度 |

---

## 🗺️ 免费部署流程图 | Free Deployment Flowchart

> **全程零费用，两种路径任选其一**
>
> **Zero cost for both paths — choose either one.**

```mermaid
flowchart TD
    Start([🚀 开始]) --> Choice{选择路径}

    subgraph shared ["📋 前置条件（共用）"]
        P1[安装 DSH Desktop\n ~5 min]:::common
        P2[克隆仓库\ngit clone\n~1 min]:::common
        P3[安装依赖\nnpm install\n~2 min]:::common
    end

    P1 & P2 & P3 --> PreDone[✅ 前置完成\n总耗时 ~8 min | ¥0]

    Choice -->|🌐 免费 Gemini API| G_PATH
    Choice -->|💻 完全离线 Ollama| O_PATH

    subgraph gemini ["🌐 免费 Gemini API 路径"]
        G_PATH --> G1[创建 Google AI Studio 账号\nhttps://aistudio.google.com\n~3 min | ¥0]:::gemini
        G1 --> G2[获取免费 API Key\n每月 1500 次额度\n~1 min | ¥0]:::gemini
        G2 --> G3[配置 mnemosyne.json\n填入 API Key\n~2 min | ¥0]:::gemini
        G3 --> G4[执行安装脚本\n./scripts/install.sh\n~1 min | ¥0]:::gemini
        G4 --> G5[验证安装\ndsh plugin list\n~1 min | ¥0]:::gemini
    end

    subgraph ollama ["💻 完全离线 Ollama 路径"]
        O_PATH --> O1[安装 Ollama\nbrew install ollama\n~2 min | ¥0]:::ollama
        O1 --> O2[拉取嵌入模型\nollama pull nomic-embed-text\n~3-5 min | ¥0]:::ollama
        O2 --> O3[配置 mnemosyne.json\n设置 provider = ollama\n~2 min | ¥0]:::ollama
        O3 --> O4[执行安装脚本\n./scripts/install.sh\n~1 min | ¥0]:::ollama
        O4 --> O5[验证安装\ndsh plugin list\n~1 min | ¥0]:::ollama
    end

    G5 --> Verify["✅ 验证与使用"]
    O5 --> Verify

    subgraph verify ["✅ 验证与使用（共用）"]
        V1[运行健康检查\ndsh doctor\n~30s | ¥0]:::verify
        V2[开始使用记忆功能\nmnemo_store / mnemo_recall\n即时 | ¥0]:::verify
        V3[知识沉淀自动维护\n跨会话持续生效\n¥0]:::verify
    end

    Verify --> V1 --> V2 --> V3

    subgraph result ["🎯 最终结果"]
        R1["🌐 Gemini 路径\n✅ 免费额度充足\n✅ 云端高精度\n⚠️ 首次需联网"]:::result
        R2["💻 Ollama 路径\n✅ 完全离线\n✅ 数据不离开本地\n⚠️ 需下载模型"]:::result
    end

    V3 --> R1
    V3 --> R2

    classDef gemini fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef ollama fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef common fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef verify fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef result fill:#fce4ec,stroke:#880e4f,stroke-width:2px
```

### 步骤耗时与费用汇总

| 路径 | 总耗时 | 费用 | 推荐场景 |
|------|--------|------|----------|
| 🌐 **免费 Gemini API** | ~12-15 min | ¥0 | 首次体验、需要高精度 |
| 💻 **完全离线 Ollama** | ~10-13 min | ¥0 | 隐私敏感、离线环境 |

### 两条路径核心差异

| 维度 | 🌐 免费 Gemini API | 💻 完全离线 Ollama |
|------|---------------------|---------------------|
| **网络依赖** | 需联网获取 API Key | 仅需首次下载模型 |
| **运行时网络** | 可选（可切换本地） | 完全离线 ✓ |
| **数据隐私** | 云端推理时上传 | 数据永不离开设备 ✓ |
| **嵌入精度** | 高（Google 模型） | 中（本地模型） |
| **硬件要求** | 任意设备 | 建议 8GB+ RAM |

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

---

## 🆓 获取免费 Gemini API Key | Get Free Gemini API Key

> **Google AI Studio 提供免费 API Key，每月 1500 次嵌入请求额度，足以满足日常使用。**
>
> **Google AI Studio offers a free API key with 1,500 embedding requests per month — enough for daily use.**

### 步骤 | Steps

```bash
# 1. 访问 Google AI Studio
open https://aistudio.google.com/apikey

# 2. 登录你的 Google 账号（Google 账号免费）

# 3. 点击 "Create API Key" 按钮
#    Click "Create API Key" button

# 4. 复制生成的 API Key（格式：AQ.Ab...）
#    Copy the generated API Key (format: AQ.Ab...)

# 5. 将 Key 添加到配置
#    Add the Key to your config
cp config/mnemosyne.json.example config/mnemosyne.json
nano config/mnemosyne.json
# 修改 apiKey 字段为你的 Key
```

### 免费版额度 | Free Tier Quota

| 功能 | Feature | 每日额度 | 每月费用 |
|------|---------|----------|----------|
| 嵌入请求 | Embedding requests | 1,500 次 | $0 |
| 文本生成 | Text generation | 60 次/分钟 | $0 |
| 超出后 | After quota exceeded | 降级为 rate limit | $0（仅限速） |

> **提示**：即使超出免费额度，服务不会停止，只是请求速率会降低。
> **Tip**: Even after exceeding the free quota, the service won't stop — only rate limits apply.

---

## 🏠 本地部署方案 | Local Deployment (Ollama)

> **如果你希望完全离线、零成本运行，可以使用 Ollama 本地部署嵌入模型。**
>
> **For fully offline, zero-cost operation, use Ollama to run embedding models locally.**

### 安装 Ollama | Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: 下载 https://ollama.com/download
```

### 拉取嵌入模型 | Pull Embedding Model

```bash
# 推荐：nomic-embed-text（768 维，轻量高效）
ollama pull nomic-embed-text

# 备选：bge-large（1024 维，精度更高但更慢）
ollama pull bge-large
```

### 配置本地模式 | Configure Local Mode

```bash
# 编辑配置文件
nano config/mnemosyne.json
```

```json
{
  "embedding": {
    "enabled": true,
    "provider": "ollama",
    "model": "nomic-embed-text",
    "dimensions": 768,
    "endpoint": "http://localhost:11434"
  }
}
```

> **优点**：完全离线、无 API 限制、数据不离开本地
> **Pros**: Fully offline, no API limits, data stays local

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

#### 方式 A：使用免费 Gemini API（推荐）| Method A: Free Gemini API (Recommended)

```bash
# 复制配置模板
cp config/mnemosyne.json.example config/mnemosyne.json

# 编辑配置，填入你的 Gemini API Key
nano config/mnemosyne.json
```

```json
{
  "embedding": {
    "provider": "gemini",
    "apiKey": "你的-Gemini-API-Key"
  }
}
```

#### 方式 B：本地 Ollama 部署 | Method B: Local Ollama

```bash
# 无需 API Key，编辑配置即可
nano config/mnemosyne.json
```

```json
{
  "embedding": {
    "provider": "ollama",
    "model": "nomic-embed-text",
    "endpoint": "http://localhost:11434"
  }
}
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
export MNEMOSYNE_PROVIDER=gemini          # ollama|gemini|openai|deepseek
export MNEMOSYNE_EMBEDDING_MODEL=gemini-embedding-001
export MNEMOSYNE_EMBEDDING_DIMENSIONS=768

# API Keys（如果使用云端 API）
export GEMINI_API_KEY=your-free-key-here  # 免费获取
export OPENAI_API_KEY=sk-xxx
export DEEPSEEK_API_KEY=sk-xxx

# Ollama 本地模式（无需 API Key）
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
    "provider": "ollama",       // ollama | gemini | openai | deepseek
    "model": "nomic-embed-text", // nomic-embed-text | gemini-embedding-001
    "dimensions": 768,
    "apiKey": "可选"            // Ollama 模式不需要此字段
  },
  "reflect": {
    "enabled": true,
    "provider": "gemini",
    "model": "gemini-flash-lite-latest",
    "temperature": 0.3,
    "maxTokens": 2000,
    "apiKey": "可选"            // Ollama 模式不需要此字段
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
| **Local Offline** | ❌ | ✅ | No external dependency | 零外部依赖 |
| **Cost** | Paid API | 🆓 **Free** | MIT License | **完全免费** |

---

## 🚀 Quick Start | 快速开始

### 快速开始（免费 Gemini API）| Quick Start (Free Gemini API)

```bash
# 1. 安装插件
git clone https://github.com/fjzzwxp/dsh-mnemosyne-memory.git ~/.dsh/plugins/
cd ~/.dsh/plugins/dsh-mnemosyne-memory && npm install

# 2. 获取免费 API Key
open https://aistudio.google.com/apikey

# 3. 配置
cp config/mnemosyne.json.example config/mnemosyne.json
# 编辑 config/mnemosyne.json，填入你的免费 API Key

# 4. 安装
./scripts/install.sh

# 5. 启动 DSH
dsh --profile web
```

### 快速开始（本地 Ollama，完全离线）| Quick Start (Local Ollama, Fully Offline)

```bash
# 1. 安装 Ollama
brew install ollama
ollama pull nomic-embed-text

# 2. 安装插件
git clone https://github.com/fjzzwxp/dsh-mnemosyne-memory.git ~/.dsh/plugins/
cd ~/.dsh/plugins/dsh-mnemosyne-memory && npm install

# 3. 配置本地模式
cp config/mnemosyne.json.example config/mnemosyne.json
# 修改 provider 为 "ollama"

# 4. 安装并启动
./scripts/install.sh && dsh --profile web
```

---

## 📝 License | 许可证

[MIT License](./LICENSE)

Copyright (c) 2025 [fjzzwxp](https://github.com/fjzzwxp)

**完全免费，可自由使用、修改和分发。**
**100% Free — use, modify, and distribute freely.**

---

## 👤 Author | 作者

**fjzzwxp** — [GitHub](https://github.com/fjzzwxp)

---

## 🔗 Links | 相关链接

- [DSH 官方文档](https://deepseek-harness.github.io/deepseek-harness/)
- [Hindsight 官方仓库](https://github.com/vectorize-io/hindsight)
- [Google AI Studio（免费 API Key）](https://aistudio.google.com/apikey)
- [Ollama 本地部署](https://ollama.com)
- [CHANGELOG](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)
- [Testing](./TESTING.md)

---

## 🏷️ Topics | 标签

`dsh` `deepseek` `harness` `plugin` `memory` `mnemosyne` `vector-search` `semantic-search` `embedding` `llm` `hindsight` `cordis` `ai-agent` `long-term-memory` `knowledge-management` `git-import` `multi-workspace` `share-memory` `open-source` `typescript` `javascript` `nodejs` `free` `local` `ollama`
# TODO: Add more tests
