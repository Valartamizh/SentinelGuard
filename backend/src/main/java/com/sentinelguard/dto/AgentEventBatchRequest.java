package com.sentinelguard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentEventBatchRequest {

    @NotEmpty(message = "Events batch cannot be empty")
    @Size(max = 500, message = "Batch cannot exceed 500 events")
    @Valid
    private List<AgentEventItem> events;

    // Optional telemetry & health reporting piggybacked on the batch
    private String monitoringStatus;
    private String processMonitorStatus;
    private String usbMonitorStatus;
    private String clipboardMonitorStatus;
    private String screenMonitorStatus;
    private Integer queuePendingCount;
    private String monitoringErrors;
}
