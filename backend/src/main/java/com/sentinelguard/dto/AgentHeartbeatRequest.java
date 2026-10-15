package com.sentinelguard.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentHeartbeatRequest {

    @NotNull(message = "Device ID is required")
    private UUID deviceId;

    private String agentVersion;
    private String status;

    private String monitoringStatus;
    private String processMonitorStatus;
    private String usbMonitorStatus;
    private String clipboardMonitorStatus;
    private String screenMonitorStatus;
    private Integer queuePendingCount;
    private String monitoringErrors;

    public AgentHeartbeatRequest(UUID deviceId, String agentVersion, String status) {
        this.deviceId = deviceId;
        this.agentVersion = agentVersion;
        this.status = status;
    }
}
