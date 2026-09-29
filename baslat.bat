@echo off
title Peak Otel Sunucusu
cls
color 0E
echo ====================================================================
echo             PEAK OTEL - BUTIK OTEL YONETIM SISTEMI
echo ====================================================================
echo.
echo   [1] Musteri Web Sitesi:    http://localhost:3000
echo   [2] Misafir Portali:       http://localhost:3000/rezervasyonlarim
echo   [3] Admin Yonetim Paneli:  http://localhost:3000/admin
echo.
echo   Sunucuyu kapatmak icin bu konsol penceresini kapatabilirsiniz.
echo ====================================================================
echo.

cd /d "%~dp0"
node server/server.js
pause
