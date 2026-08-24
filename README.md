# Mnemosyne Memory Plugin for DSH

> 对标 [Hindsight Coding Agents](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/coding-agents) 的企业级永久记忆系统

[![npm version](https://img.shields.io/badge/npm-1.2.0-blue)](https://www.npmjs.com/package/@enterprise-ai/mnemosyne-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## 项目简介

**Mnemosyne** 是 DeepSeek Harness (DSH) 的永久记忆插件，为 AI Agent 提供**跨会话的长期记忆能力**。

### 核心价值

| 价值 | 说明 |
|------|------|
| 🧠 永久记忆 | 记忆持久化存储，跨会话、跨重启不丢失 |
| 🔍 语义检索 | 支持向量语义搜索，理解自然语言查询 |
| 🤖 LLM 驱动 | 自动从会话中提取决策、洞察和惯例 |
| 📄 知识页面 | 自动生成架构图、惯例清单、项目摘要 |
| 🔧 代码测绘 | 识别 30+ 配置文件模式，自动索引 |
| 🌐 跨会话回溯 | 导入历史会话，继承已有知识 |
| 📁 多 Workspace | 按项目隔离，支持团队共享记忆 |
| ⚡ Delta 刷新 | 只更新有变化的页面，高效同步 |

### 支持的 AI 提供商

| 提供商 | 嵌入模型 | 配置方式 |
|--------|---------|---------|
| **OpenAI** | text-embedding-3-small/large | `MNEMOSYNE_PROVIDER=openai` |
| **Gemini** | text-embedding-004 | `MNEMOSYNE_PROVIDER=gemini` |
| **DeepSeek** | deepseek-embedding | `MNEMOSYNE_PROVIDER=deepseek` |
| **Ollama** | 本地模型 (bge-large/nomic-embed-text) | `MNEMOSYNE_PROVIDER=ollama` |
| **Agnes AI** | 内部模型 | `MNEMOSYNE_PROVIDER=agnes` |

---

## 功能特性

### 1. 向量语义搜索

支持多种嵌入模型，实现基于语义的理解和检索：

```javascript
// 自然语言查询
const results = await mnemo_recall('上次我们决定用什么框架？');
// → 返回相关记忆，按语义相似度排序
```

### 2. LLM 驱动的深度反思

自动从会话中提取关键信息：

- **决策提取**：识别"决定"、"选择"、"采用"等关键词
- **洞察提炼**：发现新模式、重复出现的问题
- **惯例总结**：自动归纳开发惯例和最佳实践

### 3. 知识页面自动生成

从记忆数据自动生成三类知识页面：

| 页面类型 | 内容 | 更新时机 |
|---------|------|---------|
| `architecture` | 架构决策、技术选型 | 每次反思后 |
| `conventions` | 开发惯例、编码规范 | Delta 刷新 |
| `initiatives` | 进行中项目、目标追踪 | 手动/自动 |

### 4. 代码库测绘

自动识别并索引 30+ 配置文件模式：

```
package.json / pom.xml / go.mod          # 依赖管理
tsconfig.json / webpack.config.js         # 构建配置
.eslintrc / prettier.config.js           # 代码规范
Dockerfile / docker-compose.yml          # 容器配置
.github/workflows/                       # CI/CD
.env / .env.local                        # 环境变量
```

### 5. 跨会话记忆回溯

导入历史会话，继承已有知识：

```bash
# 从 Claude Code 导入
dsh import claude --path ~/.claude/projects

# 从 ChatGPT 导出导入
dsh import chatgpt --path ./conversations.json

# 从 DSH 自身会话导入
dsh import dsh --path ~/.dsh/sessions
```

### 6. 多 Workspace 共享记忆

每个项目拥有独立的记忆银行，支持团队共享：

```
data/mnemosyne/
├── banks/
│   ├── project-x/memory.json    # 项目 X 的记忆
│   ├── project-y/memory.json    # 项目 Y 的记忆
│   └── shared/common.json       # 共享记忆
```

### 7. Delta 页面刷新

只更新有变化的页面，避免全量重算：

```javascript
// 增量更新，高效同步
const changes = await mnemo_pages_delta();
// → { added: 2, modified: 5, deleted: 0 }
```

---

## 安装方法

### 前置要求

- Node.js >= 18.0.0
- DSH (DeepSeek Harness) >= 0.1.0-rc.7
- Git（用于代码库测绘）

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/fjzzwxp/dsh-mnemosyne-memory.git
cd dsh-mnemosyne-memory

# 安装依赖
npm install

# 方式一：自动安装（推荐）
./scripts/install.sh

# 方式二：本地符号链接（开发模式）
./scripts/install.sh web --local

# 方式三：手动注册
dsh plugin --profile web add $(pwd)
```

### 验证安装

```bash
# 检查插件状态
dsh plugin --profile web list

# 运行诊断
dsh --profile web eval 'mnemo_diagnose()'

# 运行测试
npm test
```

### 卸载

```bash
# 自动卸载
./scripts/uninstall.sh

# 卸载并清除数据
./scripts/uninstall.sh web --data
```

### 独立使用（ES Module）

```javascript
import { MnemosyneBridgeService } from '@enterprise-ai/mnemosyne-memory/core';

const bridge = new MnemosyneBridgeService({
  dataDir: './data/mnemosyne',
  workingMemoryTTL: 168, // 小时
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
});

await bridge.start();
```

---

## 配置说明

### 环境变量

```bash
# 基础配置
export MNEMOSYNE_DATA_DIR=./data/mnemosyne
export MNEMOSYNE_ENABLED=true

# 嵌入模型配置
export MNEMOSYNE_PROVIDER=openai          # openai|gemini|deepseek|ollama|agnes
export MNEMOSYNE_EMBEDDING_MODEL=text-embedding-3-small
export MNEMOSYNE_EMBEDDING_DIMENSIONS=1536

# API Key
export OPENAI_API_KEY=sk-xxx
export GEMINI_API_KEY=xxx
export DEEPSEEK_API_KEY=sk-xxx

# Ollama 本地部署
export MNEMOSYNE_PROVIDER=ollama
export MNEMOSYNE_EMBEDDING_MODEL=bge-large
export MNEMOSYNE_EMBEDDING_ENDPOINT=http://localhost:11434
```

### JSON 配置文件

```json
// config/mnemosyne.json
{
  "enabled": true,
  "dataDir": "./data/mnemosyne",
  "workingMemoryTTL": 168,
  "consolidationInterval": 1800000,
  "maxWorkingMemory": 50,
  "maxLongTermMemory": 500,
  "pageRefreshEveryTurns": 10,
  "bankIdTemplate": "mnemosyne::{gitProject}",
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "gitIngest": "message",
  "codeMapping": {
    "enabled": true,
    "maxFiles": 1000,
    "patterns": ["package.json", "tsconfig.json", "*.config.js"]
  },
  "importanceWeights": {
    "maturity_assessed": 0.90,
    "decision": 0.85,
    "insight": 0.75,
    "efficiency_record": 0.70,
    "asset_created": 0.65,
    "task_create": 0.60,
    "task_update": 0.50,
    "review": 0.70,
    "commit": 0.50
  },
  "rolePriorities": {
    "ceo": 0.95,
    "consultant": 0.90,
    "researcher": 0.85,
    "architect": 0.80,
    "engineer": 0.75,
    "tester": 0.65
  }
}
```

---

## 工具列表

共 **11 个** `mnemo_*` 工具：

| 工具名 | 功能 | 关键参数 |
|--------|------|----------|
| `mnemo_recall` | 语义检索记忆 | query, k, role, min_importance |
| `mnemo_store` | 存储记忆事件 | type, content, importance, tags |
| `mnemo_reflect` | 触发 LLM 反思 | turns, force |
| `mnemo_pages_list` | 列出知识页面 | - |
| `mnemo_pages_read` | 读取知识页面 | page_id |
| `mnemo_pages_delta` | 增量刷新页面 | - |
| `mnemo_git_seed` | 导入 Git 历史 | limit |
| `mnemo_code_map` | 代码库测绘 | path, maxFiles |
| `mnemo_stats` | 获取统计信息 | - |
| `mnemo_diagnose` | 诊断工具状态 | - |
| `mnemo_import` | 导入历史会话 | sessionId, format |

---

## 使用示例

### 存储记忆

```javascript
// 记录决策
await mnemo_store({
  type: 'decision',
  content: '决定优先开发客服 AI 场景',
  importance: 0.85,
  tags: ['战略', '客服'],
  details: { reason: 'ROI 最高', owner: 'CEO' }
});

// 记录洞察
await mnemo_store({
  type: 'insight',
  content: '用户更偏好快速响应而非深度分析',
  importance: 0.75,
  tags: ['用户反馈', '体验']
});

// 记录 Git 提交
await mnemo_store({
  type: 'commit',
  content: 'feat: 添加用户认证模块',
  tags: ['dev', 'auth'],
  details: { sha: 'abc123', author: 'dev1' }
});
```

### 检索记忆

```javascript
// 语义检索
const results = await mnemo_recall({
  query: '我们之前决定用什么框架',
  k: 5,
  min_importance: 0.5
});

// 按角色过滤
const ceoInsights = await mnemo_recall({
  query: '战略方向',
  role: 'ceo',
  k: 10
});

// 按时间范围
const weeklyTrend = await mnemo_recall({
  query: '本周进展',
  time_range: {
    start: Date.now() - 7 * 24 * 3600000,
    end: Date.now()
  }
});
```

### 触发反思

```javascript
// 自动反思当前会话
const reflection = await mnemo_reflect({
  turns: 20,  // 分析最近 20 轮
  force: false
});

console.log('提取的洞察:', reflection.insights_count);
console.log('更新的页面:', reflection.knowledge_pages_updated);
```

### 知识页面操作

```javascript
// 列出所有页面
const pages = await mnemo_pages_list();
// → [{ page_id: 'architecture', title: '架构与决策', ... }]

// 读取页面
const arch = await mnemo_pages_read({ page_id: 'architecture' });

// 增量刷新
const delta = await mnemo_pages_delta();
// → { added: 2, modified: 5, deleted: 0 }
```

### 代码库测绘

```javascript
// 扫描项目配置文件
const codeMap = await mnemo_code_map({
  path: '/path/to/project',
  maxFiles: 1000
});

console.log('发现配置:', codeMap.files_count);
console.log('识别模式:', codeMap.patterns_found);
```

### Git 历史导入

```bash
# 导入最近 300 个 commit
mnemo_git_seed --limit 300

# 指定工作目录
mnemo_git_seed --workspace /path/to/project --limit 500
```

### 导入历史会话

```bash
# 从 DSH 会话导入
mnemo_import --session-id <sessionId> --format dsh

# 从 Claude Code 导入
mnemo_import --path ~/.claude/projects --format claude

# 从 ChatGPT 导出导入
mnemo_import --path ./conversations.json --format chatgpt
```

---

## 与 Hindsight 对比表

| 功能 | Hindsight | Mnemosyne | 差异说明 |
|------|-----------|-----------|----------|
| **记忆存储** | Per-repo JSON Bank | Per-workspace JSON Bank | 支持 DSH 多工作区 |
| **语义检索** | 向量相似度 | 向量 + 关键字混合 | 支持多种嵌入模型 |
| **LLM 反思** | 轻量启发式 | LLM 驱动深度反思 | 可提取更复杂模式 |
| **知识页面** | 自动生成 | 自动生成 + Delta 刷新 | 增量更新更高效 |
| **代码测绘** | 无 | 30+ 配置模式识别 | 增强上下文理解 |
| **跨会话回溯** | 无 | 支持导入历史会话 | 继承已有知识 |
| **多 Workspace** | Per-repo | Per-workspace + 共享 | 灵活隔离/共享 |
| **AI 提供商** | OpenAI only | 5 种提供商 | 更灵活的选择 |
| **Git 导入** | commit messages | 增强版（含 diff） | 更丰富的上下文 |
| **权限系统** | 无 | 角色隔离 + 重要性权重 | 企业级安全 |

---

## 许可证

[MIT License](./LICENSE)

Copyright (c) 2024 Mnemosyne Plugin Contributors

---

## 作者

企业AI转型团队

---

## 相关链接

- [架构设计文档](./.agent-teams/架构设计.md)
- [架构设计 v2](./.agent-teams/架构设计v2.md)
- [实现报告](./Mnemosyne桥接插件实现报告.md)
- [测试计划](./test/TEST_PLAN.md)
