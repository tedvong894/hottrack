#!/bin/bash
# 热点追踪 · 本地 PWA 启动器
# 双击本文件即可：启动本地服务 → 自动打开浏览器 → 离线缓存和安装功能生效。
# 直接双击 index.html 是 file:// 模式，浏览器不允许注册 Service Worker。

cd "$(dirname "$0")" || exit 1
PORT=8000
URL="http://localhost:$PORT/"

if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  echo "端口 $PORT 已有服务，直接打开浏览器。"
  echo "若打开的页面不是「热点追踪」，请先退出占用 $PORT 的程序再双击本文件。"
  open "$URL"
  exit 0
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT
sleep 1

echo "=============================================="
echo " 热点追踪 已启动"
echo " 地址：$URL"
echo " 首次打开后即可断网使用，也能安装到桌面"
echo " 关闭这个终端窗口即停止服务"
echo "=============================================="
open "$URL"
wait $PID
