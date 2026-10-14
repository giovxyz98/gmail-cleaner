@echo off
setlocal
cd /d "%~dp0"
title Gmail Cleaner

if not exist config.json (
  echo config.json non trovato.
  echo Copia config.example.json in config.json e inserisci googleClientId e googleClientSecret.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installo le dipendenze...
  call npm install
  if errorlevel 1 (
    echo npm install non riuscito.
    pause
    exit /b 1
  )
)

set PORT=3000
for /f "usebackq" %%p in (`node -e "console.log(require('./config.json').port || 3000)"`) do set PORT=%%p
set URL=http://localhost:%PORT%

rem Se il server e' gia' attivo non lo riavvio, apro solo il browser.
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul && goto open

start "Gmail Cleaner - server (chiudi questa finestra per fermarlo)" cmd /k npm start

echo Attendo che il server sia pronto...
set TRIES=0
:wait
curl -s -o nul %URL%/api/status && goto open
set /a TRIES+=1
if %TRIES% geq 20 (
  echo Il server non risponde dopo 20 secondi. Controlla la finestra del server.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait

:open
set CHROME=
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe

if defined CHROME (
  start "" "%CHROME%" %URL%
) else (
  echo Chrome non trovato, apro il browser predefinito.
  start "" %URL%
)
