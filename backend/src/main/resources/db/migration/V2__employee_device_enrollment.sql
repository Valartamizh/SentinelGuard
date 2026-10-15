-- ============================================================
-- V2__employee_device_enrollment.sql
-- SentinelGuard — Phase 2: Employee/Device enrollment schema
--
-- Do NOT modify V1. This migration builds on it.
-- All timestamps stored in UTC (TIMESTAMP without tz).
-- ============================================================

-- ── Administrator users ─────────────────────────────────────
CREATE TABLE admin_users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,      -- BCrypt
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Departments ─────────────────────────────────────────────
CREATE TABLE departments (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(200) UNIQUE NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Employees ───────────────────────────────────────────────
CREATE TABLE employees (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code   VARCHAR(50)  UNIQUE NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    department_id   UUID         NOT NULL REFERENCES departments(id),
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                                 CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status     ON employees(status);
CREATE INDEX idx_employees_code       ON employees(employee_code);

-- ── Devices ─────────────────────────────────────────────────
CREATE TABLE devices (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code      VARCHAR(50)  UNIQUE NOT NULL,
    employee_id      UUID         NOT NULL REFERENCES employees(id),
    hostname         VARCHAR(255) NOT NULL,
    operating_system VARCHAR(100),
    os_version       VARCHAR(200),
    agent_version    VARCHAR(50),
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                                  CHECK (status IN ('ACTIVE', 'REVOKED', 'RETIRED')),
    registered_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    last_seen_at     TIMESTAMP,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_devices_employee  ON devices(employee_id);
CREATE INDEX idx_devices_status    ON devices(status);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);
CREATE INDEX idx_devices_code      ON devices(device_code);

-- ── Enrollment tokens ────────────────────────────────────────
-- Plaintext token is NEVER stored — only its SHA-256 hex hash.
CREATE TABLE enrollment_tokens (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID      NOT NULL REFERENCES employees(id),
    token_hash  CHAR(64)  NOT NULL,   -- SHA-256 hex, exactly 64 chars
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP,            -- NULL = unused
    revoked_at  TIMESTAMP,            -- NULL = not revoked
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enrollment_tokens_employee ON enrollment_tokens(employee_id);
CREATE INDEX idx_enrollment_tokens_hash     ON enrollment_tokens(token_hash);

-- ── Device credentials ───────────────────────────────────────
-- One active credential per device. Plaintext stored only at enrollment,
-- never persisted. Only SHA-256 hex hash is stored.
CREATE TABLE device_credentials (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       UUID      NOT NULL REFERENCES devices(id),
    credential_hash CHAR(64)  NOT NULL,   -- SHA-256 hex
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMP,            -- NULL = active
    last_used_at    TIMESTAMP
);
CREATE INDEX idx_device_credentials_device ON device_credentials(device_id);
CREATE INDEX idx_device_credentials_hash   ON device_credentials(credential_hash);

-- ── Device heartbeats ────────────────────────────────────────
CREATE TABLE device_heartbeats (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id     UUID         NOT NULL REFERENCES devices(id),
    received_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    agent_version VARCHAR(50),
    status        VARCHAR(50)
);
CREATE INDEX idx_device_heartbeats_device   ON device_heartbeats(device_id);
CREATE INDEX idx_device_heartbeats_received ON device_heartbeats(received_at);
