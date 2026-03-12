@echo off
echo ========================================
echo   Pulizia Cache MIDA
echo ========================================
echo.
cd /d "%~dp0"

echo Eliminazione cache...
echo.

if exist .next (
    echo Rimozione .next...
    rmdir /s /q .next
)

if exist node_modules\.cache (
    echo Rimozione node_modules\.cache...
    rmdir /s /q node_modules\.cache
)

echo.
echo ========================================
echo   Cache pulita con successo!
echo ========================================
echo.
echo Ora puoi riavviare il server con:
echo   npm run dev
echo   oppure esegui start-server.bat
echo.
pause
