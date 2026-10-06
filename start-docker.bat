@echo off
setlocal
if not exist .env copy .env.example .env >nul
if not exist backend\.env copy backend\.env.example backend\.env >nul
if not exist ml-service\.env copy ml-service\.env.example ml-service\.env >nul
echo.
echo DecisionForge is starting with Docker.
echo Put your OpenAI API key in backend\.env before analyzing a decision.
echo.
docker compose up --build
