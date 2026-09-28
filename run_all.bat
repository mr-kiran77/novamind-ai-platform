@echo off
title NovaMind Dual-Engine Platform (FastAPI + Express Gateway)
cd /d "%~dp0"

echo ========================================================
echo  🚀 STARTING NOVAMIND DUAL-ENGINE PLATFORM
echo ========================================================
echo [1/2] Launching Python FastAPI AI Engine (Port 8000)...
start "NovaMind FastAPI (Port 8000)" powershell -ExecutionPolicy Bypass -File "%~dp0run.ps1"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Node.js Express API Gateway (Port 5000)...
start "NovaMind Express Gateway (Port 5000)" powershell -ExecutionPolicy Bypass -Command "$env:PATH = \"$env:LOCALAPPDATA\NodeJS;$env:PATH\"; cd '%~dp0gateway'; node server.js"

echo ========================================================
echo  ✅ PLATFORM READY!
echo  📡 Node.js Express Gateway: http://localhost:5000
echo  ⚡ Python FastAPI AI Swarm: http://localhost:8000
echo  💻 React 19 Frontend:       http://localhost:5000
echo ========================================================
pause
