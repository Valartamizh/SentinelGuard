package com.sentinelguard.controller;

import com.sentinelguard.dto.EventResponse;
import com.sentinelguard.dto.EventStatsResponse;
import com.sentinelguard.entity.EventCategory;
import com.sentinelguard.entity.EventSeverity;
import com.sentinelguard.entity.EventType;
import com.sentinelguard.service.EventAdminService;
import com.sentinelguard.service.SseBroadcasterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@Tag(name = "Admin - Endpoint Events", description = "Query, filter, and stream endpoint telemetry events")
@SecurityRequirement(name = "BearerAuth")
public class AdminEventController {

    private final EventAdminService eventAdminService;
    private final SseBroadcasterService sseBroadcasterService;

    public AdminEventController(EventAdminService eventAdminService, SseBroadcasterService sseBroadcasterService) {
        this.eventAdminService = eventAdminService;
        this.sseBroadcasterService = sseBroadcasterService;
    }

    @GetMapping("/api/v1/events")
    @Operation(summary = "Query events", description = "Paginated list of endpoint events with flexible security filters")
    public ResponseEntity<Page<EventResponse>> getEvents(
            @RequestParam(required = false) UUID deviceId,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) EventCategory category,
            @RequestParam(required = false) EventType eventType,
            @RequestParam(required = false) EventSeverity severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "occurredAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = direction.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        PageRequest pageRequest = PageRequest.of(page, Math.min(size, 100), sort);

        return ResponseEntity.ok(eventAdminService.getEvents(
                deviceId, employeeId, category, eventType, severity, startDate, endDate, search, pageRequest
        ));
    }

    @GetMapping("/api/v1/events/stats")
    @Operation(summary = "Event telemetry statistics", description = "Summary statistics of events broken down by category and recent activity")
    public ResponseEntity<EventStatsResponse> getStats() {
        return ResponseEntity.ok(eventAdminService.getEventStats());
    }

    @GetMapping("/api/v1/events/{id}")
    @Operation(summary = "Get event by ID", description = "Retrieves full details for a specific endpoint security event")
    public ResponseEntity<EventResponse> getEventById(@PathVariable UUID id) {
        return ResponseEntity.ok(eventAdminService.getEventById(id));
    }

    @GetMapping("/api/v1/devices/{deviceId}/events")
    @Operation(summary = "Get device events", description = "Retrieves paginated event history for a specific endpoint device")
    public ResponseEntity<Page<EventResponse>> getDeviceEvents(
            @PathVariable UUID deviceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageRequest = PageRequest.of(page, Math.min(size, 100), Sort.by("occurredAt").descending());
        return ResponseEntity.ok(eventAdminService.getEventsByDeviceId(deviceId, pageRequest));
    }

    @GetMapping(value = "/api/v1/events/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Live event stream (SSE)", description = "Real-time Server-Sent Events stream delivering newly ingested endpoint telemetry events")
    public SseEmitter streamEvents() {
        return sseBroadcasterService.registerClient();
    }
}
