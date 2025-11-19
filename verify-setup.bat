@echo off
REM Lumino AI - Setup Verification Script
REM Checks if all components are properly configured

echo ========================================
echo   Lumino AI - Setup Verification
echo ========================================
echo.

set ERRORS=0

REM Check Python
echo [1/10] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Python not found
    set /a ERRORS+=1
) else (
    python --version
    echo   [PASS] Python installed
)
echo.

REM Check Node.js
echo [2/10] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Node.js not found
    set /a ERRORS+=1
) else (
    node --version
    echo   [PASS] Node.js installed
)
echo.

REM Check npm
echo [3/10] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] npm not found
    set /a ERRORS+=1
) else (
    npm --version
    echo   [PASS] npm installed
)
echo.

REM Check backend directory
echo [4/10] Checking backend structure...
if not exist "backend\main.py" (
    echo   [FAIL] backend\main.py not found
    set /a ERRORS+=1
) else (
    echo   [PASS] backend\main.py exists
)
echo.

REM Check backend .env
echo [5/10] Checking backend .env file...
if not exist "backend\.env" (
    echo   [WARN] backend\.env not found
    echo          Run: copy backend\.env.example backend\.env
) else (
    echo   [PASS] backend\.env exists
    findstr /C:"OPENAI_API_KEY=" backend\.env >nul
    if errorlevel 1 (
        echo   [WARN] OPENAI_API_KEY not set in .env
    ) else (
        findstr /C:"OPENAI_API_KEY=sk-" backend\.env >nul
        if errorlevel 1 (
            echo   [WARN] OPENAI_API_KEY may not be valid (should start with sk-)
        ) else (
            echo          API key configured
        )
    )
)
echo.

REM Check backend dependencies
echo [6/10] Checking backend dependencies...
if not exist "backend\requirements.txt" (
    echo   [FAIL] requirements.txt not found
    set /a ERRORS+=1
) else (
    echo   [PASS] requirements.txt exists
    python -c "import fastapi" >nul 2>&1
    if errorlevel 1 (
        echo   [WARN] FastAPI not installed. Run: pip install -r backend\requirements.txt
    ) else (
        echo          Core dependencies detected
    )
)
echo.

REM Check frontend directory
echo [7/10] Checking frontend structure...
if not exist "frontend\src\App.jsx" (
    echo   [FAIL] frontend\src\App.jsx not found
    set /a ERRORS+=1
) else (
    echo   [PASS] frontend\src\App.jsx exists
)
echo.

REM Check frontend package.json
echo [8/10] Checking frontend package.json...
if not exist "frontend\package.json" (
    echo   [FAIL] package.json not found
    set /a ERRORS+=1
) else (
    echo   [PASS] package.json exists
)
echo.

REM Check frontend .env
echo [9/10] Checking frontend .env file...
if not exist "frontend\.env" (
    echo   [WARN] frontend\.env not found
    echo          Run: copy frontend\.env.example frontend\.env
) else (
    echo   [PASS] frontend\.env exists
)
echo.

REM Check frontend node_modules
echo [10/10] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo   [WARN] node_modules not found. Run: cd frontend ^&^& npm install
) else (
    echo   [PASS] node_modules exists
)
echo.

REM Summary
echo ========================================
echo   Verification Complete
echo ========================================
echo.

if %ERRORS% GTR 0 (
    echo [RESULT] Found %ERRORS% critical error(s)
    echo          Please fix the issues above before starting.
) else (
    echo [RESULT] All critical checks passed!
    echo          You can now run start.bat to launch Lumino AI.
)
echo.

pause
