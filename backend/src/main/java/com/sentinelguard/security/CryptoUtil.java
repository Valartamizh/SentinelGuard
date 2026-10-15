package com.sentinelguard.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

public final class CryptoUtil {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final HexFormat HEX_FORMAT = HexFormat.of();

    private CryptoUtil() {}

    /**
     * Generates a cryptographically secure random token of 32 bytes (256 bits of entropy),
     * represented as a 64-character lowercase hex string.
     */
    public static String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return HEX_FORMAT.formatHex(bytes);
    }

    /**
     * Generates a human-friendly unique device code, e.g. "DEV-8F3A2B1C".
     */
    public static String generateDeviceCode() {
        byte[] bytes = new byte[4];
        SECURE_RANDOM.nextBytes(bytes);
        return "DEV-" + HEX_FORMAT.formatHex(bytes).toUpperCase();
    }

    /**
     * Computes the SHA-256 hex digest (64 lowercase hex characters) of a string.
     */
    public static String sha256Hex(String input) {
        if (input == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HEX_FORMAT.formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * Constant-time string equality check to prevent timing attacks.
     */
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }
}
