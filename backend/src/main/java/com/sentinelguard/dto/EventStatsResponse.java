package com.sentinelguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventStatsResponse {
    private long totalEvents;
    private long processEvents;
    private long usbEvents;
    private long clipboardEvents;
    private long screenRecordingEvents;
    private long screenSharingEvents;
    private long recentEvents24h;
    private Map<String, Long> categoryBreakdown;
    private Map<String, Long> severityBreakdown;
}
