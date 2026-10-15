package com.sentinelguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {
    private long totalDevices;
    private long onlineDevices;
    private long offlineDevices;
    private long revokedDevices;
    private long totalEmployees;
}
