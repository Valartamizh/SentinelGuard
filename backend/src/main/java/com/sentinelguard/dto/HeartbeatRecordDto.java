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
public class HeartbeatRecordDto {
    private UUID id;
    private LocalDateTime receivedAt;
    private String agentVersion;
    private String status;
}
