package com.sentinelguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentTokenResponse {
    private UUID tokenId;
    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    /** Plaintext token returned ONLY once upon generation — never persisted. */
    private String enrollmentToken;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
