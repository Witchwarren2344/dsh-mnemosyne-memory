/**
 * Mnemosyne Codebase Survey Module
 * 
 * 代码库测绘功能：
 * - 扫描项目配置文件识别技术栈
 * - 识别入口文件和目录结构
 * - 生成代码库测绘结果写入知识页面
 * - session-start 时自动触发
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

// ─── 配置文件模式 ────────────────────────────────────────

const CONFIG_PATTERNS = {
  // JavaScript/TypeScript
  'package.json': { language: 'JavaScript', framework: 'npm/yarn/pnpm', type: 'package' },
  // Python
  'pyproject.toml': { language: 'Python', framework: 'PEP 517', type: 'project' },
  'requirements.txt': { language: 'Python', framework: 'pip', type: 'dependencies' },
  'setup.py': { language: 'Python', framework: 'setuptools', type: 'project' },
  'setup.cfg': { language: 'Python', framework: 'setuptools', type: 'config' },
  'poetry.lock': { language: 'Python', framework: 'Poetry', type: 'lockfile' },
  // Go
  'go.mod': { language: 'Go', framework: 'Go Modules', type: 'module' },
  'go.sum': { language: 'Go', framework: 'Go Modules', type: 'checksum' },
  // Rust
  'Cargo.toml': { language: 'Rust', framework: 'Cargo', type: 'manifest' },
  'Cargo.lock': { language: 'Rust', framework: 'Cargo', type: 'lockfile' },
  // Java
  'pom.xml': { language: 'Java', framework: 'Maven', type: 'project' },
  'build.gradle': { language: 'Java', framework: 'Gradle', type: 'project' },
  'build.gradle.kts': { language: 'Java', framework: 'Gradle Kotlin', type: 'project' },
  // Ruby
  'Gemfile': { language: 'Ruby', framework: 'Bundler', type: 'dependencies' },
  'Gemfile.lock': { language: 'Ruby', framework: 'Bundler', type: 'lockfile' },
  // PHP
  'composer.json': { language: 'PHP', framework: 'Composer', type: 'package' },
  'composer.lock': { language: 'PHP', framework: 'Composer', type: 'lockfile' },
  // .NET
  '.csproj': { language: 'C#', framework: '.NET', type: 'project' },
  '.sln': { language: 'C#', framework: '.NET', type: 'solution' },
  'packages.config': { language: 'C#', framework: 'NuGet', type: 'dependencies' },
  // Dart/Flutter
  'pubspec.yaml': { language: 'Dart', framework: 'Pub', type: 'package' },
  // Swift
  'Package.swift': { language: 'Swift', framework: 'SwiftPM', type: 'manifest' },
  // Scala
  'build.sbt': { language: 'Scala', framework: 'sbt', type: 'project' },
  // Elixir
  'mix.exs': { language: 'Elixir', framework: 'Mix', type: 'project' },
  // Clojure
  'project.clj': { language: 'Clojure', framework: 'Leiningen', type: 'project' },
  'deps.edn': { language: 'Clojure', framework: 'deps', type: 'deps' },
};

// 入口文件模式
const ENTRY_PATTERNS = {
  'main': ['index.js', 'index.ts', 'app.js', 'app.ts', 'main.js', 'main.ts'],
  'cli': ['cli.js', 'cli.ts', 'bin.js', 'bin.ts'],
  'server': ['server.js', 'server.ts', 'app.js', 'app.ts', 'index.js', 'index.ts'],
  'test': ['test.js', 'test.ts', 'spec.js', 'spec.ts', '__tests__'],
  'config': ['config.js', 'config.ts', 'settings.js', 'settings.ts'],
};

// ─── 技术栈检测 ──────────────────────────────────────────

const TECH_KEYWORDS = {
  // 前端框架
  'React': ['react', 'next.js', 'nextjs', 'gatsby', 'remix'],
  'Vue': ['vue', 'nuxt', 'nuxt.js'],
  'Angular': ['angular', '@angular'],
  'Svelte': ['svelte', '@sveltejs'],
  'Solid': ['solid', 'solidjs'],
  // 后端框架
  'Node.js': ['express', 'fastify', 'koa', 'hapi', 'nest'],
  'Python(Django)': ['django', 'djangoproject'],
  'Python(FastAPI)': ['fastapi', 'starlette'],
  'Python(Flask)': ['flask'],
  'Go(Gin)': ['gin', 'gin-gonic'],
  'Go(Echo)': ['echo', 'labstack/echo'],
  'Rust(actix)': ['actix', 'actix-web'],
  'Rust(axum)': ['axum'],
  'Java(Spring)': ['spring-boot', 'springframework'],
  'Ruby(Rails)': ['rails', 'railsgem'],
  // 数据库
  'PostgreSQL': ['pg', 'postgres', 'postgresql'],
  'MySQL': ['mysql', 'mysql2'],
  'MongoDB': ['mongodb', 'mongoose'],
  'Redis': ['redis', 'ioredis'],
  // 测试
  'Jest': ['jest'],
  'Vitest': ['vitest'],
  'Mocha': ['mocha'],
  'pytest': ['pytest'],
  'GoTest': ['testing'],
  // 工具链
  'TypeScript': ['typescript', '@types/'],
  'ESLint': ['eslint'],
  'Prettier': ['prettier'],
  'Webpack': ['webpack'],
  'Vite': ['vite'],
  'Turbopack': ['turbopack'],
};

// ─── 分析函数 ────────────────────────────────────────────

/**
 * 扫描目录结构
 */
function scanDirectoryStructure(rootPath, maxDepth = 3) {
  const structure = { entries: [], depth: 0 };
  
  function walk(dir, depth, parent) {
    if (depth > maxDepth) return;
    
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      const dirs = [];
      
      for (const entry of entries) {
        // 跳过 node_modules、.git 等
        if (['node_modules', '.git', '.next', '.nuxt', 'dist', 'build', '.DS_Store'].includes(entry.name)) {
          continue;
        }
        
        const fullpath = join(dir, entry.name);
        const relativePath = join(parent ? parent + '/' : '', entry.name);
        
        if (entry.isDirectory()) {
          dirs.push({
            name: entry.name,
            path: relativePath,
            depth: depth + 1,
          });
          walk(fullpath, depth + 1, relativePath);
        } else if (entry.isFile()) {
          structure.entries.push({
            name: entry.name,
            path: relativePath,
            size: entry.size || 0,
            depth: depth + 1,
          });
        }
      }
      
      // 只返回直接子目录，避免过多嵌套
      if (depth < maxDepth) {
        structure.children = dirs.slice(0, 20); // 每个目录最多20个子目录
      }
    } catch (err) {
      // 权限错误或不存在
    }
  }
  
  walk(rootPath, 0, '');
  return structure;
}

/**
 * 检测技术栈
 */
function detectTechStack(rootPath) {
  const detected = {
    languages: [],
    frameworks: [],
    databases: [],
    tools: [],
    configs: [],
  };
  
  // 检查配置文件
  for (const [filename, info] of Object.entries(CONFIG_PATTERNS)) {
    const filepath = join(rootPath, filename);
    if (existsSync(filepath)) {
      detected.configs.push({
        file: filename,
        language: info.language,
        framework: info.framework,
        path: filepath,
      });
      
      if (!detected.languages.includes(info.language)) {
        detected.languages.push(info.language);
      }
    }
  }
  
  // 扫描 package.json/pyproject.toml 等分析依赖
  try {
    const pkgPath = join(rootPath, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      
      // 合并所有依赖
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };
      
      for (const [depName] of Object.entries(allDeps)) {
        checkTechKeywords(depName.toLowerCase(), detected);
      }
      
      // 检查 scripts
      if (pkg.scripts) {
        for (const [scriptName, scriptCmd] of Object.entries(pkg.scripts)) {
          if (scriptCmd.includes('test') && !detected.tools.includes('Testing')) {
            detected.tools.push('Testing');
          }
          if (scriptCmd.includes('build') && !detected.tools.includes('Build')) {
            detected.tools.push('Build');
          }
        }
      }
    }
    
    const reqPath = join(rootPath, 'requirements.txt');
    if (existsSync(reqPath)) {
      const content = readFileSync(reqPath, 'utf-8');
      for (const line of content.split('\n')) {
        const dep = line.trim().split('=')[0].split('>')[0].split('<')[0];
        if (dep) checkTechKeywords(dep.toLowerCase(), detected);
      }
    }
    
    const goModPath = join(rootPath, 'go.mod');
    if (existsSync(goModPath)) {
      const content = readFileSync(goModPath, 'utf-8');
      for (const line of content.split('\n')) {
        if (line.startsWith('require ') || line.startsWith('module ')) {
          const parts = line.trim().split(' ');
          if (parts.length >= 2) checkTechKeywords(parts[1].toLowerCase(), detected);
        }
      }
    }
  } catch (err) {
    // 忽略解析错误
  }
  
  return detected;
}

function checkTechKeywords(text, detected) {
  for (const [category, keywords] of Object.entries(TECH_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword) && !detected[category.toLowerCase()].includes(category)) {
        if (!detected[category.toLowerCase()]) {
          detected[category.toLowerCase()] = [];
        }
        detected[category.toLowerCase()].push(category);
      }
    }
  }
}

/**
 * 查找入口文件
 */
function findEntryPoints(rootPath) {
  const entries = {
    main: [],
    cli: [],
    server: [],
    test: [],
    config: [],
  };
  
  try {
    const files = readdirSync(rootPath, { withFileTypes: true });
    
    for (const file of files) {
      if (!file.isFile()) continue;
      
      const name = file.name.toLowerCase();
      
      for (const [type, patterns] of Object.entries(ENTRY_PATTERNS)) {
        for (const pattern of patterns) {
          if (name === pattern.toLowerCase()) {
            entries[type].push({
              name: file.name,
              path: join(rootPath, file.name),
              size: file.size || 0,
            });
            break;
          }
        }
      }
    }
    
    // 递归搜索子目录
    for (const file of files) {
      if (file.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(file.name)) {
        const subEntries = findEntryPoints(join(rootPath, file.name));
        for (const [type, files] of Object.entries(subEntries)) {
          entries[type].push(...files);
        }
      }
    }
  } catch (err) {
    // 忽略错误
  }
  
  return entries;
}

/**
 * 统计代码行数（粗略估计）
 */
function estimateCodeStats(rootPath) {
  const stats = {
    totalFiles: 0,
    totalDirs: 0,
    totalSize: 0,
    langCounts: {},
  };
  
  function walk(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullpath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
            stats.totalDirs++;
            walk(fullpath);
          }
        } else if (entry.isFile()) {
          stats.totalFiles++;
          stats.totalSize += entry.size || 0;
          
          // 按扩展名统计
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          stats.langCounts[ext] = (stats.langCounts[ext] || 0) + 1;
        }
      }
    } catch (err) {
      // 忽略权限错误
    }
  }
  
  walk(rootPath);
  return stats;
}

/**
 * 生成测绘报告
 */
function generateSurveyReport(workspaceRoot) {
  const report = {
    workspace: workspaceRoot,
    timestamp: new Date().toISOString(),
    techStack: detectTechStack(workspaceRoot),
    structure: scanDirectoryStructure(workspaceRoot),
    entryPoints: findEntryPoints(workspaceRoot),
    codeStats: estimateCodeStats(workspaceRoot),
  };
  
  return report;
}

/**
 * 生成知识页面内容
 */
function formatSurveyPage(report) {
  const lines = [];
  
  lines.push(`# 代码库测绘报告`);
  lines.push(`\n**工作空间**: \`${report.workspace}\``);
  lines.push(`**生成时间**: ${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`\n---`);
  
  // 技术栈概览
  lines.push('\n## 技术栈\n');
  
  if (report.techStack.languages.length > 0) {
    lines.push(`**语言**: ${report.techStack.languages.join(', ')}`);
  }
  
  const allFrameworks = [
    ...report.techStack.frameworks,
    ...report.techStack.databases,
    ...report.techStack.tools,
  ];
  
  if (allFrameworks.length > 0) {
    lines.push(`\n**框架/工具**: ${allFrameworks.join(', ')}`);
  }
  
  lines.push('\n### 配置文件\n');
  for (const config of report.techStack.configs.slice(0, 10)) {
    lines.push(`- \`${config.file}\` (${config.language}, ${config.framework})`);
  }
  if (report.techStack.configs.length === 0) {
    lines.push('*未检测到标准配置文件*');
  }
  
  // 目录结构
  lines.push('\n## 目录结构\n');
  lines.push('```');
  
  function printStructure(items, prefix = '') {
    for (const item of items.slice(0, 15)) {
      lines.push(`${prefix}${item.name}/`);
      if (item.children) {
        printStructure(item.children, prefix + '  ');
      }
    }
  }
  
  if (report.structure.children?.length > 0) {
    printStructure(report.structure.children);
  } else {
    lines.push('(暂无目录信息)');
  }
  
  lines.push('```');
  
  // 入口文件
  lines.push('\n## 入口文件\n');
  
  for (const [type, files] of Object.entries(report.entryPoints)) {
    if (files.length > 0) {
      lines.push(`### ${type}\n`);
      for (const file of files.slice(0, 5)) {
        lines.push(`- \`${file.name}\``);
      }
    }
  }
  
  if (Object.values(report.entryPoints).every(f => f.length === 0)) {
    lines.push('*未检测到标准入口文件*');
  }
  
  // 代码统计
  lines.push('\n## 代码统计\n');
  lines.push(`- **总文件数**: ${report.codeStats.totalFiles}`);
  lines.push(`- **目录数**: ${report.codeStats.totalDirs}`);
  lines.push(`- **总大小**: ${(report.codeStats.totalSize / 1024).toFixed(1)} KB`);
  
  if (Object.keys(report.codeStats.langCounts).length > 0) {
    lines.push('\n**按扩展名统计**:\n');
    for (const [ext, count] of Object.entries(report.codeStats.langCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      lines.push(`- .${ext}: ${count} 个文件`);
    }
  }
  
  return lines.join('\n');
}

// ─── 公共 API ────────────────────────────────────────────

/**
 * 测绘工作空间
 */
export function surveyWorkspace(workspaceRoot) {
  try {
    const report = generateSurveyReport(workspaceRoot);
    return {
      success: true,
      report,
      summary: {
        languages: report.techStack.languages,
        frameworkCount: report.techStack.configs.length,
        fileCount: report.codeStats.totalFiles,
        dirCount: report.codeStats.totalDirs,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * 将测绘结果写入 Mnemosyne 记忆系统
 */
export async function saveSurveyToMemory(workspaceRoot, plugin) {
  const result = surveyWorkspace(workspaceRoot);
  
  if (!result.success) {
    console.warn('[Survey] 测绘失败:', result.error);
    return null;
  }
  
  // 存储为记忆事件（同步）
  const memoryId = plugin.remember(workspaceRoot, {
    type: 'survey',
    content: `代码库测绘完成: ${result.summary.languages.join(', ')} | ${result.summary.fileCount} 文件 | ${result.summary.dirCount} 目录`,
    role: 'system',
    tags: ['survey', 'codebase', ...result.summary.languages],
    importance: 0.8,
    source: 'survey',
    context: {
      summary: result.summary,
      report: result.report,
    },
  });
  
  // 生成知识页面内容
  const pageContent = formatSurveyPage(result.report);
  
  // 获取工作空间并更新页面
  const ws = plugin.getWorkspace(workspaceRoot);
  if (!ws.bank.pages) ws.bank.pages = [];
  
  // 添加或更新 survey 页面
  const existingPageIndex = ws.bank.pages.findIndex(p => p.id === 'codebase-survey');
  const surveyPage = {
    id: 'codebase-survey',
    title: '代码库测绘',
    content: pageContent,
    updated: new Date().toISOString(),
  };
  
  if (existingPageIndex >= 0) {
    ws.bank.pages[existingPageIndex] = surveyPage;
  } else {
    ws.bank.pages.push(surveyPage);
  }
  
  // 直接调用内部的 saveBank（通过访问 Map 中的 bank）
  // 由于 saveBank 不是公开 API，我们通过反射访问
  try {
    // 获取内部的 bank 对象并手动序列化保存
    const bankData = ws.bank;
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { getBankPath } = await import('./core.js').catch(() => ({}));
    
    // 使用 core.js 中的 getBankPath 函数（如果可用）
    if (getBankPath && typeof getBankPath === 'function') {
      const bankPath = getBankPath(workspaceRoot);
      fs.mkdirSync(path.dirname(bankPath), { recursive: true });
      fs.writeFileSync(bankPath, JSON.stringify(bankData, null, 2));
    }
  } catch (e) {
    // 忽略保存错误，记忆已存储到 working 中
    console.warn('[Survey] 页面保存警告:', e.message);
  }
  
  return {
    memory_id: memoryId,
    page_id: 'codebase-survey',
    summary: result.summary,
  };
}

export default { surveyWorkspace, saveSurveyToMemory };
