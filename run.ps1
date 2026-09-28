$pyExe = "$env:APPDATA\uv\python\cpython-3.12.14-windows-x86_64-none\python.exe"
if (-not (Test-Path $pyExe)) {
    $pyExe = "$env:APPDATA\uv\python\cpython-3.12-windows-x86_64-none\python.exe"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = "C:\Users\USER\.gemini\antigravity\scratch\novamind" }

$env:PYTHONPATH = "$scriptDir\.venv\Lib\site-packages;$scriptDir"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  NOVAMIND - AI Innovation Platform Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Launching with Python: $pyExe"

& $pyExe "$scriptDir\run.py"
