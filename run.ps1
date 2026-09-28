$pyExe = "$env:APPDATA\uv\python\cpython-3.12.14-windows-x86_64-none\python.exe"
if (-not (Test-Path $pyExe)) {
    $pyExe = "$env:APPDATA\uv\python\cpython-3.12-windows-x86_64-none\python.exe"
}

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = "c:\Users\USER\Downloads\antygravity ai" }

$env:PYTHONPATH = "$scriptDir\.venv\Lib\site-packages;$scriptDir"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  NOVAMIND - AI Innovation Platform Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Launching with Python: $pyExe"

& $pyExe "$scriptDir\run.py"
