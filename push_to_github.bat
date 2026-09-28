@echo off
setlocal
set PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%

echo ========================================================
echo       NOVAMIND - ONE-CLICK GITHUB PUSHER
echo ========================================================
echo.

set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/your-username/novamind.git): "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL provided. Aborting.
    pause
    exit /b 1
)

echo.
echo [1/3] Setting remote origin...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo [2/3] Setting branch to main...
git branch -M main

echo [3/3] Pushing code to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Your project is now published on GitHub!
    echo ========================================================
) else (
    echo.
    echo [NOTE] If GitHub asks you to sign in, please complete the sign-in prompt in the browser.
)

echo.
pause
