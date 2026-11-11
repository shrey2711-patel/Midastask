@echo off
title Midas Task Widget - Laptop Setup
color 0F
echo ========================================================
echo   MIDAS TASK MANAGEMENT - LAPTOP DESKTOP WIDGET SETUP
echo ========================================================
echo.
echo Select which laptop you are installing this widget on:
echo   [1] Main HP Laptop      (Workstation 1)
echo   [2] Grey Laptop         (Workstation 2)
echo   [3] Ghanshyam's Laptop  (Workstation 3)
echo.
set /p choice=Enter 1, 2, or 3: 

set DEVICE_ID=OFFICE-PC-01
if "%choice%"=="2" set DEVICE_ID=OFFICE-PC-02
if "%choice%"=="3" set DEVICE_ID=OFFICE-PC-03

set INSTALL_DIR=%LOCALAPPDATA%\MidasTaskWidget
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo.
echo [*] Installing Midas Task Desktop Widget for %DEVICE_ID%...

if exist "%~dp0MidasTaskWidget.ps1" (
    copy /Y "%~dp0MidasTaskWidget.ps1" "%INSTALL_DIR%\MidasTaskWidget.ps1" >nul
) else (
    echo [*] Downloading MidasTaskWidget.ps1 from Cloudflare Cloud...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://midastask.shreypatel00557.workers.dev/widget/MidasTaskWidget.ps1' -OutFile '%INSTALL_DIR%\MidasTaskWidget.ps1'"
)

if exist "%~dp0Launch-MidasWidget.vbs" (
    copy /Y "%~dp0Launch-MidasWidget.vbs" "%INSTALL_DIR%\Launch-MidasWidget.vbs" >nul
) else (
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://midastask.shreypatel00557.workers.dev/widget/Launch-MidasWidget.vbs' -OutFile '%INSTALL_DIR%\Launch-MidasWidget.vbs'"
)

if not exist "%INSTALL_DIR%\MidasTaskWidget.ps1" (
    echo [!] Setup failed to download widget script. Check internet connection.
    pause
    exit /b 1
)

echo [*] Enabling auto-start with Windows...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MidasTaskWidget" /t REG_SZ /d "wscript.exe \"%INSTALL_DIR%\Launch-MidasWidget.vbs\"" /f >nul

echo [*] Creating Desktop Shortcut...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Midas Task Widget.lnk'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%INSTALL_DIR%\Launch-MidasWidget.vbs\"'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.IconLocation = 'shell32.dll,22'; $s.Save()"

echo [*] Launching Desktop Widget...
wscript.exe "%INSTALL_DIR%\Launch-MidasWidget.vbs" "%DEVICE_ID%"

echo.
echo [OK] Midas Task Desktop Widget installed and running!
echo      Works across ANY WiFi, hotspot, or city via Cloud Sync.
echo.
timeout /t 4 >nul
