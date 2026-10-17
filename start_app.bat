@echo off
echo Starting DailySignal AI Platform...
echo 1. Launching FastAPI Backend on http://localhost:8000
start "DailySignal Backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo 2. Launching Vite React Frontend on http://localhost:5173
start "DailySignal Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:5173
echo Both servers are running!
