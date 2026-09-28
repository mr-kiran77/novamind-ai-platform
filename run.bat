@echo off
setlocal
echo ========================================================
echo   NOVAMIND - AI Innovation Platform Launcher
echo ========================================================
echo.

set PY_EXE=%APPDATA%\uv\python\cpython-3.12.14-windows-x86_64-none\python.exe
if not exist "%PY_EXE%" (
    set PY_EXE=%USERPROFILE%\AppData\Roaming\uv\python\cpython-3.12-windows-x86_64-none\python.exe
)

set SCRIPT_DIR=%~dp0
set PYTHONPATH=%SCRIPT_DIR%.venv\Lib\site-packages;%SCRIPT_DIR%

echo [OK] Launching with Python 3.12...
"%PY_EXE%" "%SCRIPT_DIR%run.py"
pause
