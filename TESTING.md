# 测试指南

## 运行测试

```bash
# 基础测试
npm test

# Git 相关测试
npm run test:git
```

## 手动测试

### 1. 测试向量搜索

```javascript
import { MnemosynePlugin } from './src/mnemosyne/core.js';

const plugin = new MnemosynePlugin();
plugin.init({
  embedding: {
    enabled: true,
    provider: 'gemini',
    apiKey: 'YOUR_API_KEY',
    model: 'gemini-embedding-001'
  }
});

// 存储记忆
const id = await plugin.remember('/tmp/workspace', {
  type: 'decision',
  content: '决定采用 RAG 架构',
  tags: ['架构', '决策']
});

// 语义检索
const results = await plugin.recall('/tmp/workspace', 'RAG 架构选型');
console.log(results);
```

### 2. 测试 LLM 反思

```javascript
const turns = [
  { role: 'user', content: '我们决定使用 FastAPI' },
  { role: 'assistant', content: '好的，FastAPI 是个好选择' }
];

const result = await plugin.reflect('/tmp/workspace', turns);
console.log(result); // { insights_added: N, consolidated: M, method: 'llm'|'heuristic' }
```

### 3. 测试代码库测绘

```javascript
import { surveyWorkspace } from './src/mnemosyne/survey.js';

const result = surveyWorkspace('/path/to/project');
console.log(result.techStack);
console.log(result.dependencies);
```

### 4. 测试跨会话导入

```javascript
const result = await plugin.importHistory('/tmp/workspace', {
  limit: 10,
  dryRun: false
});
console.log(result); // { imported: N, skipped_duplicates: M, errors: [...] }
```

## 测试环境要求

- Node.js >= 18
- DSH 已安装并配置
- （可选）API Key 用于向量搜索和 LLM 反思
