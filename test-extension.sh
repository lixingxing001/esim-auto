#!/bin/sh

# Chrome 插件本地测试准备脚本。
# 只检查并打包 extension/，不启动已废弃的本地 Web checkout。

set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
cd "$SCRIPT_DIR"

EXTENSION_DIR="$SCRIPT_DIR/extension"
ZIP_FILE="$SCRIPT_DIR/output/superalink-esim-extension.zip"

info() {
  printf '%s\n' "$1"
}

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

if ! command -v rtk >/dev/null 2>&1; then
  fail "缺少 rtk，无法按项目规则执行测试命令。"
fi

[ -f "$SCRIPT_DIR/package.json" ] || fail "未找到 package.json，请在项目根目录运行。"
[ -d "$EXTENSION_DIR" ] || fail "未找到 extension/ 目录，请先确认插件源码存在。"

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  info "node_modules 不存在，开始安装依赖。"
  rtk npm install
fi

info "开始检查 Chrome 插件 JS 语法。"
rtk npm run extension:check

info "开始从 extension/ 打包 Chrome 插件。"
rtk npm run extension:pack

info ""
info "插件测试准备完成。"
info "Chrome 开发模式请加载目录："
info "$EXTENSION_DIR"
info ""
info "分发压缩包位置："
info "$ZIP_FILE"
info ""
info "注意：不要加载 output/superalink-esim-extension/，后续修改代码后请在 Chrome 扩展页面点击重新加载。"
