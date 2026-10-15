package com.sentinelguard.common;

/**
 * Shared application-wide constants.
 *
 * <p>Centralising constants here avoids magic strings scattered throughout the code.
 */
public final class ApiConstants {

    /** Base path prefix for all API endpoints. */
    public static final String API_BASE = "/api/v1";

    /** Application name, should match the value in system_info. */
    public static final String APP_NAME = "SentinelGuard";

    /** Current application version. */
    public static final String APP_VERSION = "1.0.0";

    // Prevent instantiation
    private ApiConstants() {}
}
