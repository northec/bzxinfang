#!/bin/bash
# 一键启动脚本 - 滨州市住建信访管理平台
# 使用 Git Bash 或 WSL 运行: bash start.sh

set -e
cd "$(dirname "$0")"

echo "========================================"
echo "  滨州市住建信访管理平台 - 一键启动"
echo "========================================"

echo ""
echo "[1/4] 安装后端依赖..."
cd backend && npm install

echo "[2/4] 初始化数据库..."
npx prisma migrate dev --name init 2>/dev/null || echo "  数据库可能已初始化，跳过迁移"
node src/seed.js

echo "[3/4] 启动后端服务 (端口 3001)..."
node src/index.js &
BACKEND_PID=$!

sleep 3

echo "[4/4] 启动前端开发服务器 (端口 5173)..."
cd ../frontend
npx vite --host &
FRONTEND_PID=$!

sleep 3

echo ""
echo "========================================"
echo "  启动完成!"
echo "  后端: http://localhost:3001"
echo "  前端: http://localhost:5173"
echo "  账号: admin / admin123"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '服务已停止'; exit 0" SIGINT SIGTERM

wait
