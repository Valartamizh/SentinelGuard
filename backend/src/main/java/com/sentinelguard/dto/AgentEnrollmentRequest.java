package com.sentinelguard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentEnrollmentRequest {

    @NotBlank(message = "Enrollment token is required")
    private String enrollmentToken;

    @NotBlank(message = "Hostname is required")
    private String hostname;

    private String operatingSystem;
    private String osVersion;
    private String agentVersion;
}
