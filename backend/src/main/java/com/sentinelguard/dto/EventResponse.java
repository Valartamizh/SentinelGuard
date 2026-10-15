package com.sentinelguard.dto;

import com.sentinelguard.entity.EventCategory;
import com.sentinelguard.entity.EventSeverity;
import com.sentinelguard.entity.EventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private UUID id;
    private UUID eventUuid;
    private UUID deviceId;
    private String deviceCode;
    private String hostname;
    private UUID employeeId;
    private String employeeCode;
    private String employeeName;
    private String departmentName;
    private EventType eventType;
    private EventCategory category;
    private EventSeverity severity;
    private LocalDateTime occurredAt;
    private LocalDateTime receivedAt;
    private String source;
    private Map<String, Object> details;
}
