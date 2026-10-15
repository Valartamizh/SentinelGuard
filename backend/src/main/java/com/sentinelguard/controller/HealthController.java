package com.sentinelguard.controller;

import com.sentinelguard.dto.HealthResponse;
import com.sentinelguard.service.HealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing the health check endpoint.
 *
 * <p>GET /api/v1/health → {@code { "status": "UP", "service": "SentinelGuard Backend" }}
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Health", description = "Backend health and status endpoints")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    /**
     * Returns backend health status.
     *
     * <p>The React dashboard polls this endpoint to display the connection status card.
     */
    @GetMapping("/health")
    @Operation(
            summary = "Health check",
            description = "Returns the current operational status of the SentinelGuard backend service."
    )
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(healthService.getHealth());
    }
}
