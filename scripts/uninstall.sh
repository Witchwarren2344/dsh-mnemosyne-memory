#!/bin/bash
# Mnemosyne DSH Plugin - Uninstall Script
# 
# 移除插件注册并从 DSH 中卸载
#
# 用法:
#   ./scripts/uninstall.sh          # 卸载默认 profile
#   ./scripts/uninstall.sh <profile> # 卸载指定 profile
#   ./scripts/uninstall.sh --data   # 同时删除数据文件
#   ./scripts/uninstall.sh --local  # 仅移除本地符号链接

set -e

PROFILE="${1:-web}"
REMOVE_DATA="${2:-}"
REMOVE_LOCAL="${3:-}"

echo "🗑️  Mnemosyne DSH Plugin Uninstaller"
echo "===================================="
echo ""
echo "Target profile: $PROFILE"
echo ""

# 移除本地符号链接
if [ "$REMOVE_LOCAL" = "--local" ]; then
  LINK_PATH="$HOME/.dsh/plugins/mnemosyne-memory"
  if [ -L "$LINK_PATH" ]; then
    rm "$LINK_PATH"
    echo "✅ Removed symlink: $LINK_PATH"
  elif [ -d "$LINK_PATH" ]; then
    rm -rf "$LINK_PATH"
    echo "✅ Removed directory: $LINK_PATH"
  else
    echo "ℹ️  No local installation found at: $LINK_PATH"
  fi
fi

# 移除数据文件
if [ "$REMOVE_DATA" = "--data" ]; then
  DATA_DIR="$HOME/.dsh/mnemosyne-data"
  if [ -d "$DATA_DIR" ]; then
    rm -rf "$DATA_DIR"
    echo "✅ Removed data directory: $DATA_DIR"
  else
    echo "ℹ️  No data directory found at: $DATA_DIR"
  fi
  
  # 也检查项目内的 data 目录
  PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  PROJECT_DATA="$PLUGIN_ROOT/data"
  if [ -d "$PROJECT_DATA" ]; then
    rm -rf "$PROJECT_DATA"
    echo "✅ Removed project data directory: $PROJECT_DATA"
  fi
fi

# 从 DSH 卸载
if command -v dsh &> /dev/null; then
  echo ""
  echo "📋 Unregistering plugin from DSH..."
  
  # 尝试移除插件
  if dsh plugin --profile "$PROFILE" remove mnemosyne-memory 2>/dev/null; then
    echo "✅ Plugin unregistered from profile: $PROFILE"
  else
    echo "⚠️  Could not auto-remove. Please run manually:"
    echo ""
    echo "   dsh plugin --profile $PROFILE remove mnemosyne-memory"
  fi
else
  echo "⚠️  dsh command not available, skipping DSH unregistration"
fi

echo ""
echo "✅ Mnemosyne plugin uninstalled!"
echo ""
echo "Note: If you want to completely remove user data,"
echo "      run with --data flag: ./scripts/uninstall.sh $PROFILE --data"
echo ""
