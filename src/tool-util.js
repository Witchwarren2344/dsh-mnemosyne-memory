/**
 * DSH Tool 工具辅助
 * 
 * defineToolSafe: 包装 @deepseek-ai/dsh-tools 的 defineTool，
 * 1. 自动补全 output.schema 和 output.render
 * 2. 自动把 JSON Schema 风格 parameters（{type:'object', properties}）转换
 *    为 DSH 的属性映射格式（{paramName: {type, description, required}}）
 * 3. 过滤 DSH value-schema DSL 不支持的字段（minimum/maximum/length 等）
 */

import { defineTool } from '@deepseek-ai/dsh-tools';

// DSH value-schema DSL 支持的字段
const SUPPORTED_KEYS = new Set([
  'type', 'items', 'properties', 'enum', 'const', 'oneOf',
  'description', 'title', 'default', 'examples', 'required',
]);

/** 递归过滤 spec，只保留 DSH 支持的字段 */
function filterSpec(spec) {
  if (!spec || typeof spec !== 'object') return spec;
  
  const kept = {};
  for (const key of Object.keys(spec)) {
    if (!SUPPORTED_KEYS.has(key)) continue; // 丢弃 minimum/maximum/length 等
    const value = spec[key];
    if (key === 'items') {
      kept.items = filterSpec(value);
    } else if (key === 'properties') {
      const props = {};
      for (const [k, v] of Object.entries(value)) {
        props[k] = filterSpec(v);
      }
      kept.properties = props;
    } else if (key === 'oneOf') {
      kept.oneOf = Array.isArray(value) ? value.map(filterSpec) : value;
    } else {
      kept[key] = value;
    }
  }
  return kept;
}

/** 把 JSON Schema 风格 parameters 转换为 DSH 属性映射格式 */
function normalizeParameters(params) {
  if (!params || typeof params !== 'object') return params;
  
  // 情况 A：JSON Schema 包装形式 { type:'object', required:[...], properties:{...} }
  if (params.type === 'object' && params.properties && typeof params.properties === 'object') {
    const requiredList = Array.isArray(params.required) ? params.required : [];
    const pmap = {};
    for (const [key, spec] of Object.entries(params.properties)) {
      const clean = filterSpec(spec);
      if (requiredList.includes(key)) clean.required = true;
      pmap[key] = clean;
    }
    return pmap;
  }
  
  // 情况 B：已经是属性映射 { paramName: spec }，或其它
  if (!params.type) {
    const pmap = {};
    for (const [key, spec] of Object.entries(params)) {
      pmap[key] = filterSpec(spec);
    }
    return pmap;
  }
  
  // 情况 C：单个 value schema（非对象根）——保留原样
  return filterSpec(params);
}

/**
 * 安全的工具定义包装器。
 * @param {Object} options - defineTool 的选项
 * @returns {Object} registry-ready 工具定义
 */
export function defineToolSafe(options) {
  const opts = { ...options };
  
  // 转换 parameters 为 DSH 属性映射格式
  if (opts.parameters) {
    opts.parameters = normalizeParameters(opts.parameters);
  }
  
  // 自动补全 output
  if (!opts.output) {
    opts.output = {
      schema: {
        type: 'object',
        additionalProperties: true,
      },
      render: (args, value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }];
      },
    };
  }
  
  // output 存在但缺 render
  if (opts.output && !opts.output.render) {
    opts.output.render = (args, value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      return [{ type: 'text', text: JSON.stringify(value, null, 2) }];
    };
  }
  
  return defineTool(opts);
}

export default defineToolSafe;
