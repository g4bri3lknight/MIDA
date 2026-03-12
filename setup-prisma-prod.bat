@echo off
echo ========================================
echo   Setup Prisma per Produzione
echo ========================================
echo.
cd /d "%~dp0"

echo Generazione Prisma Client...
call npx prisma generate

echo.
echo Copia Prisma client in standalone...
if not exist ".next\standalone\node_modules\@prisma\client" mkdir ".next\standalone\node_modules\@prisma\client"
if not exist ".next\standalone\node_modules\.prisma" mkdir ".next\standalone\node_modules\.prisma"

xcopy "node_modules\@prisma\client" ".next\standalone\node_modules\@prisma\client" /E /I /Y
xcopy "node_modules\.prisma" ".next\standalone\node_modules\.prisma" /E /I /Y

echo.
echo Copia prisma engine...
if not exist ".next\standalone\node_modules\@prisma\engines" mkdir ".next\standalone\node_modules\@prisma\engines"
if exist "node_modules\@prisma\engines" xcopy "node_modules\@prisma\engines" ".next\standalone\node_modules\@prisma\engines" /E /I /Y

echo.
echo ========================================
echo   Setup completato!
echo ========================================
echo.
pause
