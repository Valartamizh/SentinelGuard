package com.sentinelguard.dto;

import com.sentinelguard.entity.DeviceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceDetailResponse {
    private UUID id;
    private String deviceCode;
    private String hostname;
    private String operatingSystem;
    private String osVersion;
    private String agentVersion;
    private DeviceStatus lifecycleStatus;
    private String connectivityStatus;
    private LocalDateTime registeredAt;
    private LocalDateTime lastSeenAt;

    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    private String departmentName;

    private List<HeartbeatRecordDto> recentHeartbeats;

    private String monitoringStatus;
    private String processMonitorStatus;
    private String usbMonitorStatus;
    private String clipboardMonitorStatus;
    private String screenMonitorStatus;
    private Integer queuePendingCount;
    private LocalDateTime lastEventUploadAt;
    private String monitoringErrors;
}
