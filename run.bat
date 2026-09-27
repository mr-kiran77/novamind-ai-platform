@echo off
echo ========================================================
echo   NOVAMIND - AI Innovation Platform Launcher
echo ========================================================
echo.
set UV_BIN=%USERPROFILE%\.local\bin\uv.exe
if exist "%UV_BIN%" (
    echo [OK] Using uv runtime...
    "%UV_BIN%" run python run.py
) else (
    echo [INFO] Falling back to system python...
    python run.py
)
pause
