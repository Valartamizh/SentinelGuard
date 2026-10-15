package com.sentinelguard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelguard.dto.AgentEventBatchRequest;
import com.sentinelguard.dto.AgentEventBatchResponse;
import com.sentinelguard.dto.AgentEventItem;
import com.sentinelguard.dto.EventResponse;
import com.sentinelguard.entity.*;
import com.sentinelguard.exception.BadRequestException;
import com.sentinelguard.exception.UnauthorizedAgentException;
import com.sentinelguard.repository.DeviceCredentialRepository;
import com.sentinelguard.repository.DeviceRepository;
import com.sentinelguard.repository.EndpointEventRepository;
import com.sentinelguard.security.CryptoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class EventIngestionService {

    private final DeviceCredentialRepository deviceCredentialRepository;
    private final DeviceRepository deviceRepository;
    private final EndpointEventRepository endpointEventRepository;
    private final SseBroadcasterService sseBroadcasterService;
    private final ObjectMapper objectMapper;

    public EventIngestionService(
            DeviceCredentialRepository deviceCredentialRepository,
            DeviceRepository deviceRepository,
            EndpointEventRepository endpointEventRepository,
            SseBroadcasterService sseBroadcasterService,
            ObjectMapper objectMapper) {
        this.deviceCredentialRepository = deviceCredentialRepository;
        this.deviceRepository = deviceRepository;
        this.endpointEventRepository = endpointEventRepository;
        this.sseBroadcasterService = sseBroadcasterService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AgentEventBatchResponse ingestBatch(String authorizationHeader, AgentEventBatchRequest batchRequest) {
        if (!StringUtils.hasText(authorizationHeader)) {
            throw new UnauthorizedAgentException("Missing Authorization header");
        }

        String credential = authorizationHeader.startsWith("Bearer ")
                ? authorizationHeader.substring(7).trim()
                : authorizationHeader.trim();

        if (credential.isEmpty()) {
            throw new UnauthorizedAgentException("Missing device credential");
        }

        String credentialHash = CryptoUtil.sha256Hex(credential);

        DeviceCredential deviceCredential = deviceCredentialRepository.findActiveByCredentialHash(credentialHash)
                .orElseThrow(() -> new UnauthorizedAgentException("Invalid or revoked device credential"));

        Device device = deviceCredential.getDevice();

        if (device.getStatus() != DeviceStatus.ACTIVE) {
            log.warn("Event ingestion rejected for device '{}': status is {}", device.getDeviceCode(), device.getStatus());
            throw new UnauthorizedAgentException("Device is not in ACTIVE state (current status: " + device.getStatus() + ")");
        }

        List<AgentEventItem> events = batchRequest.getEvents();
        if (events == null || events.isEmpty()) {
            throw new BadRequestException("Event batch cannot be empty");
        }

        if (events.size() > 500) {
            throw new BadRequestException("Batch size exceeds maximum limit of 500 events");
        }

        LocalDateTime now = LocalDateTime.now();
        int processedCount = 0;
        int duplicateCount = 0;
        List<EventResponse> newlySavedResponses = new ArrayList<>();
        Set<UUID> batchSeenUuids = new HashSet<>();

        for (AgentEventItem item : events) {
            if (item.getEventId() == null) {
                log.warn("Skipping event with null eventId from device {}", device.getDeviceCode());
                continue;
            }

            // Deduplication check by event UUID within batch and in DB
            if (batchSeenUuids.contains(item.getEventId()) || endpointEventRepository.existsByEventUuid(item.getEventId())) {
                log.debug("Duplicate event ignored: {}", item.getEventId());
                duplicateCount++;
                continue;
            }
            batchSeenUuids.add(item.getEventId());

            // Validate timestamps: prevent events more than 1 hour into the future
            LocalDateTime occurredAt = item.getOccurredAt();
            if (occurredAt == null) {
                occurredAt = now;
            } else if (occurredAt.isAfter(now.plusHours(1))) {
                log.warn("Event {} occurredAt is in the future ({} vs server {}). Adjusting to server time.",
                        item.getEventId(), occurredAt, now);
                occurredAt = now;
            }

            // Convert and sanitize details
            String detailsJson = "{}";
            Map<String, Object> detailsMap = item.getDetails() != null ? item.getDetails() : Collections.emptyMap();
            try {
                detailsJson = objectMapper.writeValueAsString(detailsMap);
            } catch (Exception e) {
                log.warn("Failed to serialize details for event {}: {}", item.getEventId(), e.getMessage());
            }

            EventSeverity severity = item.getSeverity() != null ? item.getSeverity() : EventSeverity.INFO;
            String source = StringUtils.hasText(item.getSource()) ? item.getSource() : "WINDOWS_AGENT";

            EndpointEvent entity = EndpointEvent.builder()
                    .eventUuid(item.getEventId())
                    .device(device)
                    .eventType(item.getEventType())
                    .category(item.getCategory())
                    .severity(severity)
                    .occurredAt(occurredAt)
                    .receivedAt(now)
                    .source(source)
                    .detailsJson(detailsJson)
                    .build();

            EndpointEvent saved = endpointEventRepository.save(entity);
            processedCount++;

            // Prepare DTO for live streaming
            EventResponse responseDto = EventResponse.builder()
                    .id(saved.getId())
                    .eventUuid(saved.getEventUuid())
                    .deviceId(device.getId())
                    .deviceCode(device.getDeviceCode())
                    .hostname(device.getHostname())
                    .employeeId(device.getEmployee() != null ? device.getEmployee().getId() : null)
                    .employeeCode(device.getEmployee() != null ? device.getEmployee().getEmployeeCode() : null)
                    .employeeName(device.getEmployee() != null ? device.getEmployee().getFullName() : null)
                    .departmentName(device.getEmployee() != null && device.getEmployee().getDepartment() != null
                            ? device.getEmployee().getDepartment().getName() : null)
                    .eventType(saved.getEventType())
                    .category(saved.getCategory())
                    .severity(saved.getSeverity())
                    .occurredAt(saved.getOccurredAt())
                    .receivedAt(saved.getReceivedAt())
                    .source(saved.getSource())
                    .details(detailsMap)
                    .build();

            newlySavedResponses.add(responseDto);
        }

        // Update device state and agent health telemetry
        device.setLastSeenAt(now);
        device.setLastEventUploadAt(now);
        if (StringUtils.hasText(batchRequest.getMonitoringStatus())) {
            device.setMonitoringStatus(batchRequest.getMonitoringStatus());
        }
        if (StringUtils.hasText(batchRequest.getProcessMonitorStatus())) {
            device.setProcessMonitorStatus(batchRequest.getProcessMonitorStatus());
        }
        if (StringUtils.hasText(batchRequest.getUsbMonitorStatus())) {
            device.setUsbMonitorStatus(batchRequest.getUsbMonitorStatus());
        }
        if (StringUtils.hasText(batchRequest.getClipboardMonitorStatus())) {
            device.setClipboardMonitorStatus(batchRequest.getClipboardMonitorStatus());
        }
        if (StringUtils.hasText(batchRequest.getScreenMonitorStatus())) {
            device.setScreenMonitorStatus(batchRequest.getScreenMonitorStatus());
        }
        if (batchRequest.getQueuePendingCount() != null) {
            device.setQueuePendingCount(batchRequest.getQueuePendingCount());
        }
        if (StringUtils.hasText(batchRequest.getMonitoringErrors())) {
            device.setMonitoringErrors(batchRequest.getMonitoringErrors());
        }
        deviceRepository.save(device);

        deviceCredential.setLastUsedAt(now);
        deviceCredentialRepository.save(deviceCredential);

        log.info("Batch processed from device '{}': {} new events, {} duplicates",
                device.getDeviceCode(), processedCount, duplicateCount);

        // Broadcast newly ingested events to active SSE streams asynchronously
        for (EventResponse eventResponse : newlySavedResponses) {
            try {
                sseBroadcasterService.broadcastEvent(eventResponse);
            } catch (Exception ex) {
                log.warn("Error broadcasting event {}: {}", eventResponse.getEventUuid(), ex.getMessage());
            }
        }

        return AgentEventBatchResponse.builder()
                .status("ACCEPTED")
                .processedCount(processedCount)
                .duplicateCount(duplicateCount)
                .serverTime(now)
                .build();
    }
}
