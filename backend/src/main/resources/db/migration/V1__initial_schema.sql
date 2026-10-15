-- ============================================================
-- V1__initial_schema.sql
-- SentinelGuard — Phase 1 initial schema
--
-- Creates the system_info table and inserts one bootstrap record.
-- ============================================================

CREATE TABLE IF NOT EXISTS system_info (
    id               BIGSERIAL    PRIMARY KEY,
    application_name VARCHAR(100) NOT NULL,
    version          VARCHAR(20)  NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Bootstrap record — documents the running application version.
INSERT INTO system_info (application_name, version, created_at)
VALUES ('SentinelGuard', '1.0.0', NOW());
