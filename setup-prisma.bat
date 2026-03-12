@echo off
echo ========================================
echo   Rigenerazione Prisma Client
echo ========================================
echo.
cd /d "%~dp0"

node node_modules\prisma\build\index.js generate

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   Completato!
    echo ========================================
    echo.
    echo Ora aggiorna .env con il percorso corretto, esempio:
    echo   DATABASE_URL=file:C:/MIDA-PROD/custom.db
    echo.
) else (
    echo.
    echo ERRORE! Prova manualmente:
    echo   node node_modules\prisma\build\index.js generate
    echo.
)
pause
