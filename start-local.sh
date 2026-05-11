#!/bin/sh

# macOS 和 WSL 本地启动脚本。
# 默认启动 Superalink checkout Web，地址为 http://127.0.0.1:53334/。

set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
cd "$SCRIPT_DIR"

DEFAULT_HOST=${SUPERALINK_CHECKOUT_HOST:-127.0.0.1}
DEFAULT_PORT=${SUPERALINK_CHECKOUT_PORT:-53334}
HOST=$DEFAULT_HOST
PORT=$DEFAULT_PORT
HAS_PORT=0
HAS_DEBUG=0
EXPECT_VALUE_FOR=""

for arg in "$@"; do
  if [ "$EXPECT_VALUE_FOR" = "--port" ]; then
    PORT=$arg
    EXPECT_VALUE_FOR=""
    continue
  fi

  if [ "$EXPECT_VALUE_FOR" = "--host" ]; then
    HOST=$arg
    EXPECT_VALUE_FOR=""
    continue
  fi

  case "$arg" in
    --port)
      HAS_PORT=1
      EXPECT_VALUE_FOR="--port"
      ;;
    --host)
      EXPECT_VALUE_FOR="--host"
      ;;
    --debug)
      HAS_DEBUG=1
      ;;
  esac
done

if [ -n "$EXPECT_VALUE_FOR" ]; then
  printf '%s\n' "参数缺少值: $EXPECT_VALUE_FOR" >&2
  exit 1
fi

case "$PORT" in
  ''|*[!0-9]*)
    printf '%s\n' "端口不合法: $PORT" >&2
    exit 1
    ;;
esac

if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  printf '%s\n' "端口不在有效范围 1-65535: $PORT" >&2
  exit 1
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '%s\n' "缺少命令: $1，请先安装后再启动。" >&2
    exit 1
  fi
}

is_port_busy() {
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
  fi

  if command -v ss >/dev/null 2>&1; then
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -E "[.:]$PORT$" >/dev/null 2>&1; then
      return 0
    fi
  fi

  if command -v netstat >/dev/null 2>&1; then
    if netstat -an 2>/dev/null | grep -E "[.:]$PORT[[:space:]].*LISTEN" >/dev/null 2>&1; then
      return 0
    fi
  fi

  return 1
}

show_port_owner() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN || true
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | grep -E "[.:]$PORT[[:space:]]" || true
    return
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | grep -E "[.:]$PORT[[:space:]].*LISTEN" || true
  fi
}

require_command node
require_command npm

if is_port_busy; then
  printf '%s\n' "端口 $PORT 已被占用，请换一个端口或先关闭已有服务。"
  show_port_owner
  printf '%s\n' "示例: sh start-local.sh --port 53335"
  exit 1
fi

if [ ! -d node_modules ] || [ ! -x node_modules/.bin/tsx ]; then
  printf '%s\n' "依赖不存在，开始执行 npm install。"
  npm install
fi

if [ "$HAS_PORT" -eq 0 ]; then
  set -- "$@" --port "$PORT"
fi

if [ "$HAS_DEBUG" -eq 0 ]; then
  set -- "$@" --debug
fi

DISPLAY_HOST=$HOST
if [ "$DISPLAY_HOST" = "0.0.0.0" ]; then
  DISPLAY_HOST=127.0.0.1
fi

printf '%s\n' "启动 Superalink 本地工具。"
printf '%s\n' "访问地址: http://$DISPLAY_HOST:$PORT/"
printf '%s\n' "停止服务: 在当前终端按 Ctrl+C"

npm run checkout:superalink -- "$@"
