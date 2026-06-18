@echo off
title Lancement de l'Application de Relance Facture

:: Se positionner dans le dossier contenant ce script
cd /d "%~dp0"

echo =====================================================================
echo                 LANCEMENT DU PROJET RELANCE FACTURE
echo =====================================================================
echo.

:: Demarrage du Backend
echo [-] Demarrage du serveur backend (API HTTP sur port 3002 et SMTP sur port 1025)...
start "Backend - Relance Facture" cmd /k "node dev-backend.js"

:: Attendre 2 secondes pour laisser le backend demarrer
timeout /t 2 /nobreak >nul

:: Demarrage du Frontend
echo [-] Demarrage du serveur de developpement frontend (Vite)...
start "Frontend - Relance Facture" cmd /k "npm run dev"

echo.
echo =====================================================================
echo [OK] Les serveurs ont ete demarres dans des fenetres separees.
echo      - API HTTP backend : http://localhost:3002
echo      - Serveur SMTP de test : port 1025
echo =====================================================================
echo.
pause
