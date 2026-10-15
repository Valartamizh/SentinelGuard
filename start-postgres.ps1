# ============================================================
# SentinelGuard — Start PostgreSQL (PowerShell)
# Run this from the project root before starting the backend.
# ============================================================
# Adds Docker Desktop bin to PATH so docker-credential-desktop
# is found, then runs docker compose.
# ============================================================

$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"

if (Test-Path $dockerBin) {
    # Add Docker bin to PATH for this session
    $env:PATH = "$dockerBin;$env:PATH"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker Desktop not found in PATH or at '$dockerBin'. Please install and start Docker Desktop."
    exit 1
}

Write-Host "[INFO] Starting PostgreSQL container..." -ForegroundColor Cyan

Push-Location $PSScriptRoot
docker compose up -d postgres
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] PostgreSQL is starting on port 5432" -ForegroundColor Green
    Write-Host "[OK] Database: sentinelguard / User: sentinelguard" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Start the backend with:" -ForegroundColor Yellow
    Write-Host "  cd backend; .\start-backend.cmd" -ForegroundColor White
} else {
    Write-Error "Failed to start PostgreSQL. Check that Docker Desktop is running."
}
