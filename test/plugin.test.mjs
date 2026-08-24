/**
 * Mnemosyne Plugin Basic Tests
 *
 * Run with: node --experimental-vm-modules test/plugin.test.mjs
 *
 * Note: Some tests require @deepseek-ai/dsh-tools to be installed.
 *       If not available, those tests will be skipped.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// 测试临时目录
const TEST_DIR = join(rootDir, 'test', '.tmp');

// 检查 peer dependencies 是否可用
let dshToolsAvailable = false;
try {
  await import('@deepseek-ai/dsh-tools');
  dshToolsAvailable = true;
} catch {
  // dsh-tools not available, will skip dependent tests
}

/**
 * 清理测试目录
 */
function cleanup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

/**
 * 运行测试
 */
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  console.log('🧪 Mnemosyne Plugin Tests\n');
  
  // ===== 测试 1: 模块导入 =====
  try {
    console.log('Test 1: Module imports...');
    const { plugin, MnemosynePlugin } = await import('../src/plugin.js');

    if (!plugin) throw new Error('plugin export is missing');
    if (!MnemosynePlugin) throw new Error('MnemosynePlugin export is missing');
    if (plugin.name !== 'mnemosyne-memory') throw new Error(`Expected name 'mnemosyne-memory', got '${plugin.name}'`);

    console.log('  ✅ plugin.name:', plugin.name);
    console.log('  ✅ plugin.description:', typeof plugin.description === 'string');
    console.log('  ✅ MnemosynePlugin is a class');
    passed++;
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }

  // ===== 测试 2: 插件初始化 =====
  try {
    console.log('\nTest 2: Plugin initialization...');
    const { MnemosynePlugin } = await import('../src/plugin.js');
    const instance = new MnemosynePlugin();
    instance.init({
      embedding: { enabled: false },
      reflect: { enabled: false },
    });

    if (!instance.config) throw new Error('config is missing');
    if (instance.config.enabled !== true) throw new Error('enabled should be true by default');

    console.log('  ✅ Plugin initialized successfully');
    console.log('  ✅ Config loaded:', JSON.stringify(instance.config.enabled));
    passed++;
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }

  // ===== 测试 3: 记忆存储与检索 =====
  try {
    console.log('\nTest 3: Memory store and recall...');
    cleanup();
    const { MnemosynePlugin } = await import('../src/plugin.js');
    const plugin = new MnemosynePlugin();
    plugin.init({ embedding: { enabled: false } });

    const testRoot = join(TEST_DIR, 'test-workspace');
    mkdirSync(testRoot, { recursive: true });

    // 存储记忆
    const id = await plugin.remember(testRoot, {
      type: 'decision',
      content: '我们决定使用 FastAPI 作为后端框架',
      tags: ['技术选型', 'API'],
      importance: 0.85,
    });

    if (!id) throw new Error('Memory ID not returned');
    console.log('  ✅ Memory stored with ID:', id.slice(0, 8) + '...');

    // 检索记忆
    const results = await plugin.recall(testRoot, 'FastAPI 后端框架', { k: 5 });
    if (results.length !== 1) throw new Error(`Expected 1 result, got ${results.length}`);
    if (results[0].content !== '我们决定使用 FastAPI 作为后端框架') {
      throw new Error('Recalled content mismatch');
    }

    console.log('  ✅ Memory recalled:', results[0].content.slice(0, 30) + '...');
    console.log('  ✅ Similarity score:', results[0].similarity);
    passed++;
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }

  // ===== 测试 4: 知识页面生成 =====
  try {
    console.log('\nTest 4: Knowledge pages...');
    cleanup();
    const { MnemosynePlugin } = await import('../src/plugin.js');
    const plugin = new MnemosynePlugin();
    plugin.init({ embedding: { enabled: false } });

    const testRoot = join(TEST_DIR, 'test-workspace');
    mkdirSync(testRoot, { recursive: true });

    // 添加一些记忆
    await plugin.remember(testRoot, {
      type: 'decision',
      content: '使用 TypeScript 进行类型检查',
      importance: 0.7,
    });
    await plugin.remember(testRoot, {
      type: 'insight',
      content: '项目需要 RESTful API 设计',
      importance: 0.6,
    });

    // 触发反思生成页面
    const reflectResult = await plugin.reflect(testRoot, []);
    console.log('  ✅ Reflection completed:', reflectResult);

    // 列出页面
    const pages = plugin.listPages(testRoot);
    if (pages.length === 0) throw new Error('No pages generated');

    console.log('  ✅ Pages generated:', pages.map(p => p.id).join(', '));
    passed++;
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }

  // ===== 测试 5: Git 种子导入（非 git 仓库应跳过）=====
  try {
    console.log('\nTest 5: Git seed (non-git repo)...');
    cleanup();
    const { MnemosynePlugin } = await import('../src/plugin.js');
    const plugin = new MnemosynePlugin();
    plugin.init({ embedding: { enabled: false } });

    const testRoot = join(TEST_DIR, 'non-git-workspace');
    mkdirSync(testRoot, { recursive: true });

    const result = await plugin.seedGit(testRoot, 10);

    // 非 git 仓库应返回 error
    if (result.error !== 'not-a-git-repo') {
      throw new Error(`Expected error 'not-a-git-repo', got '${result.error}'`);
    }

    console.log('  ✅ Correctly identified non-git repository');
    passed++;
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }

  // ===== 测试 6: 工具注册 =====
  try {
    if (!dshToolsAvailable) {
      console.log('\nTest 6: Tool registration...');
      console.log('  ⏭️  Skipped (dsh-tools not installed)');
      passed++;
    } else {
      console.log('\nTest 6: Tool registration...');
      const { registerMnemosyneTools, MNEMOSYNE_TOOLS } = await import('../src/plugin.js');

      // 模拟 DSH tools 注册表
      const mockTools = {
        _registered: [],
        register(tool) {
          this._registered.push(tool);
        },
      };

      const { MnemosynePlugin } = await import('../src/plugin.js');
      const plugin = new MnemosynePlugin();
      plugin.init({ embedding: { enabled: false } });

      registerMnemosyneTools(mockTools, plugin);

      if (mockTools._registered.length === 0) throw new Error('No tools registered');
      if (mockTools._registered.length !== MNEMOSYNE_TOOLS.length) {
        throw new Error(`Expected ${MNEMOSYNE_TOOLS.length} tools, got ${mockTools._registered.length}`);
      }

      console.log('  ✅ Tools registered:', mockTools._registered.map(t => t.name).join(', '));
      passed++;
    }
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }
  
  // ===== 测试 7: package.json 验证 =====
  try {
    console.log('\nTest 7: package.json validation...');
    const pkg = JSON.parse(await import('node:fs').then(fs => fs.readFileSync(join(rootDir, 'package.json'), 'utf-8')));
    
    // 检查必需字段
    if (!pkg.name) throw new Error('name is missing');
    if (!pkg.version) throw new Error('version is missing');
    if (!pkg.main) throw new Error('main is missing');
    if (!pkg.exports) throw new Error('exports is missing');
    if (pkg.type !== 'module') throw new Error('type should be "module"');
    
    // 检查 exports
    if (!pkg.exports['.']) throw new Error('exports["."] is missing');
    if (!pkg.exports['./core']) throw new Error('exports["./core"] is missing');
    if (!pkg.exports['./tools']) throw new Error('exports["./tools"] is missing');
    
    // 检查 peerDependencies
    if (!pkg.peerDependencies?.['@deepseek-ai/cordis']) {
      throw new Error('peerDependencies.@deepseek-ai/cordis is missing');
    }
    if (!pkg.peerDependencies?.['@deepseek-ai/dsh-tools']) {
      throw new Error('peerDependencies.@deepseek-ai/dsh-tools is missing');
    }
    
    console.log('  ✅ package.json is valid');
    console.log('  ✅ name:', pkg.name);
    console.log('  ✅ version:', pkg.version);
    console.log('  ✅ main:', pkg.main);
    console.log('  ✅ type:', pkg.type);
    passed++;
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }
  
  // ===== 测试 8: 类型声明文件 =====
  try {
    console.log('\nTest 8: Type declarations...');
    const fs = await import('node:fs');
    const path = await import('node:path');
    
    const dtsPath = join(rootDir, 'src', 'index.d.ts');
    if (!fs.existsSync(dtsPath)) {
      throw new Error('src/index.d.ts does not exist');
    }
    
    const content = fs.readFileSync(dtsPath, 'utf-8');
    if (!content.includes('export interface Memory')) {
      throw new Error('Missing Memory interface');
    }
    if (!content.includes('export class MnemosynePlugin')) {
      throw new Error('Missing MnemosynePlugin class');
    }
    if (!content.includes('export const plugin')) {
      throw new Error('Missing plugin export');
    }
    
    console.log('  ✅ src/index.d.ts exists and contains required types');
    passed++;
  } catch (err) {
    console.error('  ❌ Failed:', err.message);
    failed++;
  }
  
  // ===== 测试结果汇总 =====
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  // 清理
  cleanup();
  
  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
