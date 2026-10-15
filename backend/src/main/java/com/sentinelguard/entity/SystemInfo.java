package com.sentinelguard.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * Represents the system_info table.
 *
 * <p>This table stores a single record describing the running application
 * version. It is populated by the initial Flyway migration (V1).
 */
@Entity
@Table(name = "system_info")
@Getter
@Setter
@NoArgsConstructor
@ToString
public class SystemInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Application name (e.g. "SentinelGuard"). */
    @Column(name = "application_name", nullable = false, length = 100)
    private String applicationName;

    /** Semantic version (e.g. "1.0.0"). */
    @Column(name = "version", nullable = false, length = 20)
    private String version;

    /** Timestamp when this record was inserted by Flyway. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
