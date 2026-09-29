@echo off
set "PATH=%LOCALAPPDATA%\NodeJS;%PATH%"
call npm.cmd run build
