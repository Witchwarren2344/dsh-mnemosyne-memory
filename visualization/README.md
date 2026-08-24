# Mnemosyne 记忆可视化

基于 Chart.js 的记忆数据可视化工具。

## 使用方法

1. 将 `memory.json` 文件放入本目录
2. 用浏览器打开 `index.html`
3. 查看记忆分布、重要决策、知识页面等

## 功能

- 📊 记忆类型分布饼图
- 🎯 重要性分布柱状图
- 📋 记忆列表展示
- 📄 知识页面渲染
- 📥 数据导出

## 数据来源

从 DSH 插件输出：
```bash
# 导出当前工作区的记忆数据
python3 -c "
import json
with open('~/.dsh/plugins/dsh-mnemosyne-memory/data/mnemosyne/banks/<workspace>/memory.json') as f:
    data = json.load(f)
print(json.dumps(data, indent=2))
" > visualization/memory.json
```
