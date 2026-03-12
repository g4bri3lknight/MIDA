@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   Build MIDA - Migration Dashboard
echo   (Windows Version)
echo ========================================
echo.
cd /d "%~dp0"

echo.
echo Inizializzazione database (prisma db push)...
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo ATTENZIONE: Errore durante prisma db push
    echo Procedo comunque con la build...
)
echo.

echo Pulizia build precedente...
if exist .next rd /s /q .next 2>nul

echo.
echo Esecuzione della build di produzione...
echo Questa operazione potrebbe richiedere alcuni minuti...
echo.

call npx next build

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   ERRORE durante la build!
    echo ========================================
    echo.
    echo Possibili soluzioni:
    echo   1. Verifica che Node.js sia installato
    echo   2. Esegui: npm install
    echo   3. Esegui: npx prisma generate
    echo.
    pause
    exit /b 1
)

echo.
echo Copia file per produzione...

rem Crea le cartelle necessarie
if not exist ".next\standalone\.next\static" mkdir ".next\standalone\.next\static"
if not exist ".next\standalone\public" mkdir ".next\standalone\public"
if not exist ".next\standalone\prisma" mkdir ".next\standalone\prisma"

rem Copia i file statici
echo Copia .next/static...
xcopy ".next\static" ".next\standalone\.next\static" /E /I /Y

echo Copia public...
xcopy "public" ".next\standalone\public" /E /I /Y

echo Copia prisma schema...
copy "prisma\schema.prisma" ".next\standalone\prisma\schema.prisma" /Y

rem Copia il database
echo Copia database...
if exist "db\custom.db" (
    copy "db\custom.db" ".next\standalone\custom.db" /Y
    echo   Database copiato
) else (
    echo   ATTENZIONE: File db\custom.db non trovato!
)

rem Copia SOLO i moduli Prisma necessari (non tutto node_modules)
echo Copia moduli Prisma...

rem @prisma/client
if not exist ".next\standalone\node_modules\@prisma\client" mkdir ".next\standalone\node_modules\@prisma\client"
xcopy "node_modules\@prisma\client" ".next\standalone\node_modules\@prisma\client" /E /I /Y

rem .prisma (client generato)
if not exist ".next\standalone\node_modules\.prisma" mkdir ".next\standalone\node_modules\.prisma"
xcopy "node_modules\.prisma" ".next\standalone\node_modules\.prisma" /E /I /Y

rem @prisma/engines
if exist "node_modules\@prisma\engines" (
    if not exist ".next\standalone\node_modules\@prisma\engines" mkdir ".next\standalone\node_modules\@prisma\engines"
    xcopy "node_modules\@prisma\engines" ".next\standalone\node_modules\@prisma\engines" /E /I /Y
)

rem prisma CLI
if not exist ".next\standalone\node_modules\prisma" mkdir ".next\standalone\node_modules\prisma"
xcopy "node_modules\prisma" ".next\standalone\node_modules\prisma" /E /I /Y

rem Crea file .env
echo Creazione .env...
echo DATABASE_URL=file:custom.db > .next\standalone\.env

rem Copia script di avvio
copy "start-server-prod.bat" ".next\standalone\start-server-prod.bat" /Y

rem Crea script per rigenerare Prisma nella destinazione
(
echo @echo off
echo echo ========================================
echo echo   Regenerazione Prisma Client
echo echo ========================================
echo echo.
echo cd /d "%%~dp0"
echo.
echo node node_modules\prisma\build\index.js generate
echo.
echo if %%errorlevel%% equ 0 (
echo     echo.
echo     echo ========================================
echo     echo   Completato!
echo     echo ========================================
echo     echo.
echo     echo Ora aggiorna .env con il percorso corretto, esempio:
echo     echo   DATABASE_URL=file:C:/MIDA-PROD/custom.db
echo     echo.
echo ) else (
echo     echo.
echo     echo ERRORE! Prova manualmente:
echo     echo   node node_modules\prisma\build\index.js generate
echo     echo.
echo )
echo pause
) > .next\standalone\setup-prisma.bat

echo.
echo ========================================
echo   Build completata con successo!
echo ========================================
echo.
echo La cartella .next\standalone contiene solo i file necessari.
echo.
echo ========================================
echo   ISTRUZIONI PER IL DEPLOY
echo ========================================
echo.
echo 1. Copia .next\standalone nella destinazione
echo.
echo 2. Esegui setup-prisma.bat per rigenerare il client
echo.
echo 3. Modifica .env con il percorso assoluto:
echo    DATABASE_URL=file:C:/TUO-PERCORSO/custom.db
echo.
echo 4. Avvia con start-server-prod.bat
echo.

pause
