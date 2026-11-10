@echo off
chcp 65001 >nul
cd /d "%~dp0"
title БитБлокнот

echo.
echo   БитБлокнот — интерактивный репетитор по информатике
echo   ====================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [!] Python не найден. Установите Python 3.12 или новее с python.org
    echo     и при установке отметьте галочку "Add Python to PATH".
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo [1/2] Создаю виртуальное окружение .venv ...
    python -m venv .venv
    if errorlevel 1 goto :fail
)

echo [2/2] Проверяю библиотеки ...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
    echo [!] Не удалось установить библиотеки. Если нет интернета, но запуск уже был раньше,
    echo     сайт всё равно попробует запуститься.
)

echo.
echo   Сайт открывается в браузере: http://127.0.0.1:5000
echo   Чтобы остановить, закройте это окно.
echo.
start "" http://127.0.0.1:5000
".venv\Scripts\python.exe" app.py
goto :eof

:fail
echo [!] Что-то пошло не так. Покажите это окно взрослому или учителю.
pause
