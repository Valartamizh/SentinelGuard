@echo off
:: ============================================================
:: SentinelGuard — Start Backend Script (Windows)
:: ============================================================
:: This script sets the required environment variable and starts
:: the Spring Boot backend. Run from the /backend directory.
::
:: Prerequisites:
::   - Java 21 installed
::   - PostgreSQL running (docker compose up -d postgres)
:: ============================================================

setlocal

:: Set JAVA_HOME if not already defined
if not defined JAVA_HOME (
    if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot" (
        set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot"
    )
)

:: Load environment variables from root .env file if it exists
set ENV_FILE=%~dp0..\.env
if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%ENV_FILE%") do (
        if "%%A"=="DB_PASSWORD" set DB_PASSWORD=%%B
        if "%%A"=="JWT_SECRET" set JWT_SECRET=%%B
        if "%%A"=="ADMIN_USERNAME" set ADMIN_USERNAME=%%B
        if "%%A"=="ADMIN_PASSWORD" set ADMIN_PASSWORD=%%B
    )
)

:: Fallback defaults if not defined
if not defined DB_PASSWORD set DB_PASSWORD=SentinelGuard_Dev_2024!
if not defined JWT_SECRET set JWT_SECRET=U2VudGluZWxHdWFyZC1KV1QtU2VjcmV0LURldi0yMDI0LU11c3RDaGFuZ2VJblByb2R1Y3Rpb24hISE=
if not defined ADMIN_USERNAME set ADMIN_USERNAME=admin
if not defined ADMIN_PASSWORD set ADMIN_PASSWORD=SentinelAdmin2024!

echo [INFO] Starting SentinelGuard Backend...
echo [INFO] Backend URL: http://localhost:8080
echo [INFO] Swagger UI:  http://localhost:8080/swagger-ui.html
echo.

call mvnw.cmd spring-boot:run

endlocal
