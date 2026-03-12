@echo off
echo ========================================
echo   Avvio MIDA - Migration Dashboard
echo   (Modalita' Produzione)
echo ========================================
echo.
cd /d "%~dp0"

echo Avvio del server sulla porta 3000...
echo Premi CTRL+C per fermare il server
echo.

rem Cambia alla directory standalone dove si trovano .env e db
cd .next\standalone

set NODE_ENV=production
node server.js
