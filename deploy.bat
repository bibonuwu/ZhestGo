@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

rem Qoldau: публикация сайта на https://qoldau-ym.web.app
rem (Firebase Hosting + правила и индексы Firestore).
rem Запуск: двойной клик по файлу или "deploy.bat" в терминале.

echo.
echo ===  Qoldau: публикация на https://qoldau-ym.web.app  ===
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Не найден Node.js. Установите версию 20 или новее: https://nodejs.org
  goto fail
)

if not exist node_modules (
  echo [1/5] Установка зависимостей...
  call npm install
  if errorlevel 1 goto fail
) else (
  echo [1/5] Зависимости уже установлены.
)

rem Firebase CLI: установленный глобально или через npx.
set "FIREBASE=firebase"
where firebase >nul 2>nul
if errorlevel 1 set "FIREBASE=npx --yes firebase-tools"

echo [2/5] Проверка входа в Firebase...
call %FIREBASE% login:list | findstr /c:"Logged in as" >nul
if errorlevel 1 (
  echo     Войдите в Google-аккаунт с доступом к проекту qoldau-4630c.
  call %FIREBASE% login
  if errorlevel 1 goto fail
)

echo [3/5] Сжатие новых видео жестов из папки video...
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo     ffmpeg не найден, шаг пропущен. Уже сжатые видео опубликуются как есть.
) else (
  call npm run videos
  if errorlevel 1 goto fail
)

echo [4/5] Проверка тестами...
call npm test
if errorlevel 1 goto fail

echo [5/5] Сборка и публикация...
call npm run build:firebase
if errorlevel 1 goto fail
call %FIREBASE% deploy --only hosting,firestore --project qoldau-4630c
if errorlevel 1 goto fail

echo.
echo [OK] Готово: https://qoldau-ym.web.app
echo.
call :hold
exit /b 0

:fail
echo.
echo [X] Публикация остановлена: смотрите сообщения выше.
echo.
call :hold
exit /b 1

:hold
rem Окно, открытое двойным кликом, не закрывается сразу.
echo %cmdcmdline% | findstr /i /c:"%~nx0" >nul && pause
exit /b 0
