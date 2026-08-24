#!/bin/bash
# Mnemosyne DSH Plugin - Install Script
# 
# 自动将插件安装/注册到 DSH
#
# 用法:
#   ./scripts/install.sh              # 安装到默认 profile
#   ./scripts/install.sh <profile>    # 安装到指定 profile
#   ./scripts/install.sh --local      # 仅本地链接（不修改全局配置）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROFILE="${1:-web}"
LOCAL_ONLY="${2:-}"

echo "🔧 Mnemosyne DSH Plugin Installer"
echo "=================================="
echo ""
echo "Plugin root: $PLUGIN_ROOT"
echo "Target profile: $PROFILE"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js >= 18"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js >= 18 required, found v$NODE_VERSION"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# 检查 DSH
if ! command -v dsh &> /dev/null; then
  echo "⚠️  dsh command not found in PATH"
  echo "   Installing as local symlink instead..."
  LOCAL_ONLY="--local"
fi

# 安装依赖
echo ""
echo "📦 Installing dependencies..."
cd "$PLUGIN_ROOT"
npm install --production
echo "✅ Dependencies installed"

# 创建本地符号链接（用于开发）
if [ "$LOCAL_ONLY" = "--local" ]; then
  echo ""
  echo "🔗 Creating local symlink..."
  LINK_PATH="$HOME/.dsh/plugins/mnemosyne-memory"
  
  if [ -L "$LINK_PATH" ]; then
    rm "$LINK_PATH"
  fi
  
  mkdir -p "$(dirname "$LINK_PATH")"
  ln -sf "$PLUGIN_ROOT" "$LINK_PATH"
  
  echo "✅ Plugin symlinked to: $LINK_PATH"
  echo ""
  echo "To use this plugin, add the following to your DSH config:"
  echo ""
  echo "  dsh plugin --profile $PROFILE add $LINK_PATH"
  exit 0
fi

# 注册为 DSH 插件
if command -v dsh &> /dev/null; then
  echo ""
  echo "📋 Registering plugin with DSH..."
  
  # 尝试不同的注册命令格式
  if dsh plugin --profile "$PROFILE" add "$PLUGIN_ROOT" 2>/dev/null; then
    echo "✅ Plugin registered successfully"
  else
    echo "⚠️  Direct registration failed, trying alternative method..."
    # 尝试使用绝对路径
    ABS_PATH="$(realpath "$PLUGIN_ROOT")"
    dsh plugin --profile "$PROFILE" add "$ABS_PATH" 2>/dev/null && echo "✅ Plugin registered successfully" || echo "⚠️  Could not auto-register. Please run manually:"
    echo ""
    echo "   dsh plugin --profile $PROFILE add $PLUGIN_ROOT"
  fi
else
  echo "⚠️  dsh command not available, skipping registration"
fi

echo ""
echo "✅ Mnemosyne plugin installed!"
echo ""
echo "Next steps:"
echo "  1. Configure API keys:"
echo "     export MNEMOSYNE_EMBEDDING_API_KEY='your-key'"
echo "     export MNEMOSYNE_REFLECT_API_KEY='your-key'"
echo ""
echo "  2. Copy config example:"
echo "     cp config/mnemosyne.json.example config/mnemosyne.json"
echo ""
echo "  3. Start using the plugin in your DSH sessions"
echo ""
