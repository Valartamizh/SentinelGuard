package com.sentinelguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentEventBatchResponse {
    private String status;
    private int processedCount;
    private int duplicateCount;
    private LocalDateTime serverTime;
}
