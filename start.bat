@echo off
REM AI Assistant Studio - One-Click Setup & Run Script (Windows)
REM This script sets up and runs your AI Assistant Studio with enhanced Monaco Editor

echo.
echo 🎯 AI Assistant Studio - One-Click Setup ^& Run
echo ==============================================
echo.

REM Check if Node.js is available
echo [INFO] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [SUCCESS] Node.js version: %NODE_VERSION%

REM Check if npm is available
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [SUCCESS] npm version: %NPM_VERSION%
echo.

REM Install dependencies if node_modules doesn't exist
echo [INFO] Checking dependencies...
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if %errorlevel% equ 0 (
        echo [SUCCESS] Dependencies installed successfully
    ) else (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Dependencies already installed
)

echo.

REM Check database
echo [INFO] Checking database connection...
if defined DATABASE_URL (
    echo [SUCCESS] Database URL found
) else (
    echo [WARNING] No DATABASE_URL found. Database will be created automatically if needed.
)

echo.

REM Setup database schema
echo [INFO] Setting up database schema...
npm run db:push --force >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Database schema synchronized
) else (
    echo [WARNING] Database schema sync skipped (may not be needed)
)

echo.

REM Start the application
echo [INFO] Starting AI Assistant Studio...
echo.
echo 🚀 Features included:
echo    ✨ Enhanced Monaco Editor with Replit-like experience
echo    🔍 Real-time error checking and diagnostics
echo    🧠 Advanced IntelliSense and code completion
echo    🎨 Professional code formatting with format-on-save
echo    🔧 Multi-language linting (JS/TS/Python/JSON)
echo    📊 Interactive diagnostics panel
echo    ⌨️  Professional keyboard shortcuts
echo    💾 File management with drag-and-drop uploads
echo    🤖 AI chat integration with code saving
echo.
echo 🌐 Application will be available at: http://localhost:5000
echo.
echo [INFO] Starting development server...
echo.

REM Set NODE_ENV to development if not set
if not defined NODE_ENV set NODE_ENV=development

REM Start the application
npm run dev