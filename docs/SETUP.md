# SentinelGuard — Local Setup Guide (Phase 2)

This guide walks through starting and configuring all SentinelGuard components on Windows.

---

## 1. Prerequisites

- **OS**: Windows 10/11 64-bit
- **Java**: OpenJDK 21 (Eclipse Temurin 21.0.7+)
- **Python**: Python 3.12+ (tested on Python 3.13)
- **Node.js**: v18+ (tested with npm)
- **Docker**: Docker Desktop (for persistent PostgreSQL 16)

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

Ensure the variables are set:
```ini
POSTGRES_PASSWORD=SentinelGuard_Dev_2024!
DB_PASSWORD=SentinelGuard_Dev_2024!
JWT_SECRET=U2VudGluZWxHdWFyZC1KV1QtU2VjcmV0LURldi0yMDI0LU11c3RDaGFuZ2VJblByb2R1Y3Rpb24hISE=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SentinelAdmin2024!
```

---

## 3. Starting the Services

### Step 1: Start PostgreSQL
```powershell
.\start-postgres.ps1
```
Or with docker directly:
```powershell
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose up -d postgres
```

### Step 2: Start Spring Boot Backend
```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot"
$env:DB_PASSWORD = "SentinelGuard_Dev_2024!"
$env:JWT_SECRET = "U2VudGluZWxHdWFyZC1KV1QtU2VjcmV0LURldi0yMDI0LU11c3RDaGFuZ2VJblByb2R1Y3Rpb24hISE="
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "SentinelAdmin2024!"
.\mvnw.cmd spring-boot:run
```
Flyway automatically applies `V1__initial_schema.sql` and `V2__employee_device_enrollment.sql`.
Swagger UI available at: `http://localhost:8080/swagger-ui.html`.

### Step 3: Start React Admin Dashboard
```powershell
cd dashboard
npm install
npm run dev
```
Open `http://localhost:5173`. Log in with username `admin` and password `SentinelAdmin2024!`.

### Step 4: Install and Run Python Windows Agent
```powershell
cd agent
python -m pip install -r requirements.txt

# Verify agent CLI
python -m src.main status
```

---

## 4. How to Rotate Administrator Credentials

1. To change the password for an existing administrator:
   Update the `password_hash` column in `admin_users` table with a new BCrypt hash, or:
2. Delete the administrator record:
   ```sql
   DELETE FROM admin_users WHERE username = 'admin';
   ```
3. Update `ADMIN_PASSWORD` in your `.env` file and restart the Spring Boot backend. The `AdminBootstrapRunner` will generate a new BCrypt hash and insert the fresh record.
