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
public class AgentEnrollmentResponse {
    private UUID deviceId;
    private String deviceCode;
    /** Plaintext device credential returned ONLY once upon successful enrollment. */
    private String deviceCredential;
    private String status;
    private LocalDateTime registeredAt;
}
