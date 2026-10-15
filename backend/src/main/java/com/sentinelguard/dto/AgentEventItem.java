package com.sentinelguard.dto;

import com.sentinelguard.entity.EventCategory;
import com.sentinelguard.entity.EventSeverity;
import com.sentinelguard.entity.EventType;
import jakarta.validation.constraints.NotNull;
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
public class AgentEventItem {

    @NotNull(message = "Event ID is required")
    private UUID eventId;

    private UUID deviceId; // Captured from request body if sent, but authenticated credential device is authoritative

    @NotNull(message = "Event type is required")
    private EventType eventType;

    @NotNull(message = "Event category is required")
    private EventCategory category;

    private EventSeverity severity;

    @NotNull(message = "Occurred timestamp is required")
    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.sentinelguard.common.FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime occurredAt;

    private String source;

    private Map<String, Object> details;
}
