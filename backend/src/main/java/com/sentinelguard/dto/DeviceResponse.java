package com.sentinelguard.dto;

import com.sentinelguard.entity.DeviceStatus;
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
public class DeviceResponse {
    private UUID id;
    private String deviceCode;
    private String hostname;
    private String operatingSystem;
    private String osVersion;
    private String agentVersion;
    private DeviceStatus lifecycleStatus;
    /** Dynamically calculated: ONLINE, OFFLINE, REVOKED, or RETIRED */
    private String connectivityStatus;
    private LocalDateTime registeredAt;
    private LocalDateTime lastSeenAt;

    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    private String departmentName;
}
