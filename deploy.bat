@echo off
echo ========================================
echo   Deploy MIDA - Migration Dashboard
echo   Setup completo per produzione
echo ========================================
echo.
cd /d "%~dp0"

echo PASSO 1: Installazione dipendenze...
echo.
call npm install
if %errorlevel% neq 0 (
    echo ERRORE durante l'installazione delle dipendenze!
    pause
    exit /b 1
)

echo.
echo PASSO 2: Setup database...
echo.
call npx prisma generate
call npx prisma db push

echo.
echo PASSO 3: Build di produzione...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo ERRORE durante la build!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup completato con successo!
echo ========================================
echo.
echo Il server e' pronto per essere avviato.
echo Esegui 'start-server-prod.bat' per avviarlo.
echo.
pause
