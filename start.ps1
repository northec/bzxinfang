# 一键启动脚本 - 滨州市住建信访管理平台
# 使用 PowerShell 运行: .\start.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  滨州市住建信访管理平台 - 一键启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 启动后端
Write-Host "`n[1/4] 安装后端依赖..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "后端依赖安装失败" -ForegroundColor Red; exit 1 }

Write-Host "[2/4] 初始化数据库..." -ForegroundColor Yellow
npx prisma migrate dev --name init 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  数据库可能已初始化，跳过迁移" -ForegroundColor DarkGray
}
node src/seed.js

Write-Host "[3/4] 启动后端服务 (端口 3001)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectRoot\backend
    node src/index.js
}

# 等待后端启动
Start-Sleep -Seconds 3

# 启动前端
Write-Host "[4/4] 启动前端开发服务器 (端口 5173)..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectRoot\frontend
    npx vite --host
}

Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  启动完成!" -ForegroundColor Green
Write-Host "  后端: http://localhost:3001" -ForegroundColor Green
Write-Host "  前端: http://localhost:5173" -ForegroundColor Green
Write-Host "  账号: admin / admin123" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`n按 Ctrl+C 停止服务" -ForegroundColor DarkGray

# 保持运行
try {
    while ($true) {
        # 检查后端进程是否存活
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        if ($backendOutput) { Write-Host $backendOutput -ForegroundColor DarkGray }

        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        if ($frontendOutput) { Write-Host $frontendOutput -ForegroundColor DarkGray }

        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`n正在停止服务..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
    Remove-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue
    Write-Host "服务已停止" -ForegroundColor Green
}
