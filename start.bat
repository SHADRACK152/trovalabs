@echo off
REM Lumino AI - Complete System Startup Script
REM Starts both backend and frontend servers

echo ========================================
echo   Lumino AI - Voice Chatbot Startup
echo ========================================
echo.

REM Check if in correct directory
if not exist "backend\main.py" (
    echo ERROR: Please run this script from the Lumino AI root directory
    pause
    exit /b 1
)

REM Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check for Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [1/5] Checking backend dependencies...
cd backend
if not exist ".env" (
    echo WARNING: .env file not found. Creating from .env.example...
    copy .env.example .env >nul
    echo.
    echo IMPORTANT: Please edit backend\.env and add your API keys:
    echo   - GROQ_API_KEY from https://console.groq.com/keys
    echo   - OPENAI_API_KEY from https://platform.openai.com/api-keys
    echo.
    pause
)

echo [2/5] Starting backend server (Port 8000)...
start "Lumino Backend" cmd /k "C:\Users\Trova\Lumino ai\.venv\Scripts\python.exe main.py"
timeout /t 5 /nobreak >nul

echo [3/5] Checking frontend dependencies...
cd ..\frontend
if not exist "node_modules" (
    echo Installing frontend dependencies - this may take a few minutes...
    call npm install
)

if not exist ".env" (
    echo Creating frontend .env file...
    copy .env.example .env >nul
)

echo [4/5] Starting frontend dev server on Port 5173...
start "Lumino Frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo [5/5] Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   Lumino AI Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Two terminal windows are now open:
echo   1. Backend server - Python/FastAPI
echo   2. Frontend dev server - Vite/React
echo.
echo To stop the servers, close both terminal windows.
echo.
echo Press any key to exit this window...
pause >nul
