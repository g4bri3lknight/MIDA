@echo off
echo ========================================
echo   Setup Prisma - Post Copia
echo   Eseguire dopo aver spostato la cartella
echo ========================================
echo.
cd /d "%~dp0"

echo Verifica struttura cartelle...
if not exist "node_modules\@prisma\client" (
    echo ERRORE: node_modules\@prisma\client non trovato!
    echo Assicurati che la cartella node_modules sia presente.
    pause
    exit /b 1
)

if not exist "prisma\schema.prisma" (
    echo ERRORE: prisma\schema.prisma non trovato!
    pause
    exit /b 1
)

echo.
echo Generazione Prisma Client...
call node node_modules\prisma\build\index.js generate

if %errorlevel% neq 0 (
    echo.
    echo Tentativo alternativo...
    call node_modules\.bin\prisma generate
)

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   ERRORE durante prisma generate!
    echo ========================================
    echo.
    echo Prova a installare prisma globalmente:
    echo   npm install -g prisma
    echo Poi esegui: prisma generate
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup completato!
echo ========================================
echo.
echo Ora puoi avviare il server con:
echo   set NODE_ENV=production
echo   node server.js
echo.

pause
