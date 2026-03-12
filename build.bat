@echo off
echo ========================================
echo   Build MIDA - Migration Dashboard
echo ========================================
echo.
cd /d "%~dp0"

echo Pulizia build precedente...
if exist .next rd /s /q .next 2>nul

echo.
echo Esecuzione della build di produzione...
echo Questa operazione potrebbe richiedere alcuni minuti...
echo.

npm run build

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Build completata con successo!
    echo ========================================
    echo.
    echo Per avviare il server di produzione:
    echo   - Esegui start-server-prod.bat
    echo   - Oppure: npm run start
    echo.
) else (
    echo.
    echo ========================================
    echo   ERRORE durante la build!
    echo ========================================
    echo.
    echo Possibili soluzioni:
    echo   1. Verifica che Node.js sia installato
    echo   2. Esegui: npm install
    echo   3. Esegui: npm run db:push
    echo.
)

pause
