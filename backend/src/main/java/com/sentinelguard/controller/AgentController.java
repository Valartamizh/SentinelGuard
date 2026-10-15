package com.sentinelguard.controller;

import com.sentinelguard.dto.AgentEnrollmentRequest;
import com.sentinelguard.dto.AgentEnrollmentResponse;
import com.sentinelguard.dto.AgentHeartbeatRequest;
import com.sentinelguard.dto.AgentHeartbeatResponse;
import com.sentinelguard.service.AgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
@Tag(name = "Agent - Endpoint Communication", description = "Endpoints called directly by Windows agent")
public class AgentController {

    private final AgentService agentService;

    @PostMapping("/enroll")
    @Operation(summary = "Enroll device", description = "Consumes a one-time enrollment token to register the device and issue a permanent device credential")
    public ResponseEntity<AgentEnrollmentResponse> enroll(@Valid @RequestBody AgentEnrollmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agentService.enrollDevice(request));
    }

    @PostMapping("/heartbeat")
    @Operation(summary = "Send agent heartbeat", description = "Authenticates device credential and updates device last_seen_at timestamp")
    public ResponseEntity<AgentHeartbeatResponse> heartbeat(
            @Parameter(description = "Device credential in Bearer format: Bearer <device-credential>")
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody AgentHeartbeatRequest request) {
        return ResponseEntity.ok(agentService.processHeartbeat(authorizationHeader, request));
    }
}
