@echo off
setlocal

set "APP_DIR=%~dp0"
set "PORT=8000"
set "URL=http://localhost:%PORT%"

cd /d "%APP_DIR%"

echo Starting local server on %URL% ...
start "SlopSlayer Server" /min cmd /c "python -m http.server %PORT%"

rem give the server a moment to come up
timeout /t 2 /nobreak >nul

set "CHROME="
for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
  if exist %%P set "CHROME=%%~P"
)

if not defined CHROME (
  echo Could not find chrome.exe in the usual install locations.
  echo Edit start.bat and set CHROME to the correct path.
  pause
  goto :cleanup
)

echo Launching Chrome in kiosk mode...
rem Dedicated profile (not --incognito) so localStorage (highscore/leaderboard)
rem survives across kiosk restarts instead of being wiped with the session.
set "PROFILE_DIR=%APP_DIR%.chrome-kiosk-profile"
start "" /wait "%CHROME%" --kiosk --user-data-dir="%PROFILE_DIR%" --no-first-run --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --disable-session-crashed-bubble "%URL%"

:cleanup
echo Closing local server...
taskkill /fi "WINDOWTITLE eq SlopSlayer Server*" /t /f >nul 2>&1

endlocal
