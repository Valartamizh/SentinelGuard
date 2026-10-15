package com.sentinelguard.controller;

import com.sentinelguard.dto.EnrollmentTokenCreateRequest;
import com.sentinelguard.dto.EnrollmentTokenResponse;
import com.sentinelguard.service.EnrollmentTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/enrollment-tokens")
@RequiredArgsConstructor
@Tag(name = "Admin - Enrollment Tokens", description = "One-time device enrollment token issuance")
@SecurityRequirement(name = "BearerAuth")
public class AdminEnrollmentTokenController {

    private final EnrollmentTokenService enrollmentTokenService;

    @PostMapping
    @Operation(summary = "Generate enrollment token", description = "Generates a 256-bit cryptographically secure one-time enrollment token expiring in 15 minutes")
    public ResponseEntity<EnrollmentTokenResponse> createEnrollmentToken(@Valid @RequestBody EnrollmentTokenCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(enrollmentTokenService.createEnrollmentToken(request));
    }
}
