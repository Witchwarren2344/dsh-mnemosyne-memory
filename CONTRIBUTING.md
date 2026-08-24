# 贡献指南

感谢你对 Mnemosyne 永久记忆插件的关注！本文档说明了如何参与项目贡献。

## 🌟 贡献方式

### 报告 Bug
- 使用 GitHub Issues 报告 bug
- 提供复现步骤、预期行为和实际行为
- 包含环境信息（DSH 版本、Node.js 版本等）

### 提出新功能
- 先创建 Issue 讨论想法
- 说明使用场景和预期行为
- 等待维护者确认后再开始开发

### 提交代码
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 提交变更 (`git commit -am 'Add some feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

### 代码规范
- 使用 ES Module 语法（`import`/`export`）
- 遵循现有代码风格
- 添加必要的注释（中文）
- 确保所有测试通过

## 📝 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: 新增向量语义搜索功能
fix: 修复 recall 函数返回值类型错误
docs: 更新 README 安装说明
test: 添加 memory 模块单元测试
chore: 更新依赖版本
```

## 🧪 测试

```bash
# 运行基础测试
npm test

# 运行 Git 相关测试
npm run test:git
```

## 📋 PR 检查清单

- [ ] 代码符合项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 变更日志已更新
- [ ] 没有引入敏感信息（API Key 等）

## 🤝 行为准则

- 尊重他人意见
- 使用包容性语言
- 接受建设性批评
- 专注于最佳解决方案

## 📄 许可证

本项目采用 MIT 许可证。提交贡献即表示你同意将代码以相同许可证发布。
