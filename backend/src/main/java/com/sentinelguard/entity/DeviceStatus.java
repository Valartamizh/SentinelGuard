package com.sentinelguard.entity;

/**
 * Lifecycle status of a registered device.
 *
 * <p>ONLINE/OFFLINE are NOT stored — they are calculated dynamically
 * from {@code last_seen_at} relative to the server clock.
 */
public enum DeviceStatus {
    ACTIVE,   // Enrolled and allowed to send heartbeats
    REVOKED,  // Manually revoked by administrator
    RETIRED   // Decommissioned (future use)
}
