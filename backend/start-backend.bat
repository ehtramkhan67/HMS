@echo off
title HMS PostgreSQL Backend
cd /d "%~dp0"
echo Starting HMS cadet directory API on http://localhost:3001 ...
node server.js
pause
