package com.sentinelguard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "endpoint_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "device")
public class EndpointEvent {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "event_uuid", nullable = false, unique = true)
    private UUID eventUuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 50)
    private EventCategory category;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private EventSeverity severity = EventSeverity.INFO;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "received_at", nullable = false, updatable = false)
    private LocalDateTime receivedAt;

    @Builder.Default
    @Column(name = "source", nullable = false, length = 50)
    private String source = "WINDOWS_AGENT";

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details_json", nullable = false, columnDefinition = "jsonb")
    private String detailsJson = "{}";

    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) {
            receivedAt = LocalDateTime.now();
        }
        if (severity == null) {
            severity = EventSeverity.INFO;
        }
        if (source == null) {
            source = "WINDOWS_AGENT";
        }
        if (detailsJson == null) {
            detailsJson = "{}";
        }
    }
}
