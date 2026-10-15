-- ============================================================
-- V3__endpoint_events.sql
-- SentinelGuard — Phase 3: Endpoint Telemetry & Activity Monitoring
--
-- Adds endpoint_events table and agent monitoring health status fields.
-- All timestamps stored in UTC (TIMESTAMP without tz).
-- ============================================================

-- ── Endpoint Security Events ─────────────────────────────────
CREATE TABLE endpoint_events (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_uuid    UUID         NOT NULL UNIQUE,
    device_id     UUID         NOT NULL REFERENCES devices(id),
    event_type    VARCHAR(50)  NOT NULL,
    category      VARCHAR(50)  NOT NULL,
    severity      VARCHAR(20)  NOT NULL DEFAULT 'INFO'
                               CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    occurred_at   TIMESTAMP    NOT NULL,
    received_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    source        VARCHAR(50)  NOT NULL DEFAULT 'WINDOWS_AGENT',
    details_json  JSONB        NOT NULL DEFAULT '{}'::jsonb
);

-- Performance & Query Indexes
CREATE INDEX idx_endpoint_events_device      ON endpoint_events(device_id);
CREATE INDEX idx_endpoint_events_occurred    ON endpoint_events(occurred_at DESC);
CREATE INDEX idx_endpoint_events_received    ON endpoint_events(received_at DESC);
CREATE INDEX idx_endpoint_events_category    ON endpoint_events(category);
CREATE INDEX idx_endpoint_events_type        ON endpoint_events(event_type);
CREATE INDEX idx_endpoint_events_severity    ON endpoint_events(severity);
CREATE INDEX idx_endpoint_events_composite   ON endpoint_events(device_id, category, occurred_at DESC);

-- ── Extend devices table with agent monitoring telemetry ────
ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS monitoring_status        VARCHAR(30) DEFAULT 'MONITORING_ACTIVE',
    ADD COLUMN IF NOT EXISTS process_monitor_status   VARCHAR(30) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS usb_monitor_status       VARCHAR(30) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS clipboard_monitor_status VARCHAR(30) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS screen_monitor_status    VARCHAR(30) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS queue_pending_count      INT         DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_event_upload_at     TIMESTAMP,
    ADD COLUMN IF NOT EXISTS monitoring_errors        TEXT;
