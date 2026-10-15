package com.sentinelguard.dto;

/**
 * Response DTO for the health check endpoint.
 *
 * @param status  Simple status string (e.g. "UP")
 * @param service Human-readable service name
 */
public record HealthResponse(String status, String service) {

    /** Convenience factory for the standard healthy response. */
    public static HealthResponse up() {
        return new HealthResponse("UP", "SentinelGuard Backend");
    }
}
