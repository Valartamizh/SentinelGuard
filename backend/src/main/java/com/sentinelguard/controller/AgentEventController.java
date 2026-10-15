package com.sentinelguard.controller;

import com.sentinelguard.dto.AgentEventBatchRequest;
import com.sentinelguard.dto.AgentEventBatchResponse;
import com.sentinelguard.service.EventIngestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/agent/events")
@Tag(name = "Agent - Telemetry Ingestion", description = "Endpoints for endpoint event transmission")
public class AgentEventController {

    private final EventIngestionService eventIngestionService;

    public AgentEventController(EventIngestionService eventIngestionService) {
        this.eventIngestionService = eventIngestionService;
    }

    @PostMapping("/batch")
    @Operation(summary = "Ingest event batch", description = "Authenticates device credential and ingests a batch of endpoint security events")
    public ResponseEntity<AgentEventBatchResponse> ingestBatch(
            @Parameter(description = "Device credential in Bearer format: Bearer <device-credential>")
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody AgentEventBatchRequest batchRequest) {

        return ResponseEntity.ok(eventIngestionService.ingestBatch(authorizationHeader, batchRequest));
    }
}
