package com.sentinelguard.common;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String text = p.getText();
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        text = text.trim();

        // 1. Try standard LocalDateTime (e.g. 2026-10-09T10:00:00)
        try {
            return LocalDateTime.parse(text);
        } catch (Exception ignored) {}

        // 2. Try OffsetDateTime with timezone offset (e.g. 2026-10-09T10:00:00+00:00 or with Z)
        try {
            return OffsetDateTime.parse(text).toLocalDateTime();
        } catch (Exception ignored) {}

        // 3. Try Instant (e.g. 2026-10-09T10:00:00.123Z)
        try {
            return Instant.parse(text).atZone(ZoneId.systemDefault()).toLocalDateTime();
        } catch (Exception ignored) {}

        // 4. Fallback ISO formatters
        try {
            return LocalDateTime.parse(text, DateTimeFormatter.ISO_DATE_TIME);
        } catch (Exception e) {
            throw new IOException("Failed to parse date string: " + text, e);
        }
    }
}
