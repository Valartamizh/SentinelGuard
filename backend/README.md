# SentinelGuard Backend — Local Development README
# ─────────────────────────────────────────────────────────────
# This directory contains the Spring Boot REST API.
#
# Quick Start:
#
#   Option A — Use the startup script (recommended):
#     start-backend.cmd
#
#   Option B — Set env var manually, then run Maven:
#     set DB_PASSWORD=SentinelGuard_Dev_2024!
#     mvnw.cmd spring-boot:run
#
# Prerequisites:
#   - Java 21 (Eclipse Temurin recommended)
#   - PostgreSQL running on port 5432
#     (start with: docker compose up -d postgres  from project root)
#
# URLs:
#   API:       http://localhost:8080/api/v1/health
#   Swagger:   http://localhost:8080/swagger-ui.html
#   API Docs:  http://localhost:8080/v3/api-docs
#   Actuator:  http://localhost:8080/actuator/health
