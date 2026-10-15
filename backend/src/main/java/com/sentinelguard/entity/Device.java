package com.sentinelguard.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "devices")
@Getter @Setter @NoArgsConstructor @ToString(exclude = "employee")
public class Device {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "device_code", nullable = false, unique = true, length = 50)
    private String deviceCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false, length = 255)
    private String hostname;

    @Column(name = "operating_system", length = 100)
    private String operatingSystem;

    @Column(name = "os_version", length = 200)
    private String osVersion;

    @Column(name = "agent_version", length = 50)
    private String agentVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeviceStatus status = DeviceStatus.ACTIVE;

    @Column(name = "registered_at", nullable = false)
    private LocalDateTime registeredAt;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "monitoring_status", length = 30)
    private String monitoringStatus = "MONITORING_ACTIVE";

    @Column(name = "process_monitor_status", length = 30)
    private String processMonitorStatus = "ACTIVE";

    @Column(name = "usb_monitor_status", length = 30)
    private String usbMonitorStatus = "ACTIVE";

    @Column(name = "clipboard_monitor_status", length = 30)
    private String clipboardMonitorStatus = "ACTIVE";

    @Column(name = "screen_monitor_status", length = 30)
    private String screenMonitorStatus = "ACTIVE";

    @Column(name = "queue_pending_count")
    private Integer queuePendingCount = 0;

    @Column(name = "last_event_upload_at")
    private LocalDateTime lastEventUploadAt;

    @Column(name = "monitoring_errors", columnDefinition = "TEXT")
    private String monitoringErrors;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (registeredAt == null) {
            registeredAt = LocalDateTime.now();
        }
        if (status == null) {
            status = DeviceStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
