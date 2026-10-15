package com.sentinelguard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelguard.dto.EventResponse;
import com.sentinelguard.dto.EventStatsResponse;
import com.sentinelguard.entity.EndpointEvent;
import com.sentinelguard.entity.EventCategory;
import com.sentinelguard.entity.EventSeverity;
import com.sentinelguard.entity.EventType;
import com.sentinelguard.exception.ResourceNotFoundException;
import com.sentinelguard.repository.EndpointEventRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class EventAdminService {

    private final EndpointEventRepository endpointEventRepository;
    private final ObjectMapper objectMapper;

    public EventAdminService(EndpointEventRepository endpointEventRepository, ObjectMapper objectMapper) {
        this.endpointEventRepository = endpointEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<EventResponse> getEvents(
            UUID deviceId,
            UUID employeeId,
            EventCategory category,
            EventType eventType,
            EventSeverity severity,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String search,
            Pageable pageable) {

        Specification<EndpointEvent> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (deviceId != null) {
                predicates.add(cb.equal(root.get("device").get("id"), deviceId));
            }
            if (employeeId != null) {
                predicates.add(cb.equal(root.get("device").get("employee").get("id"), employeeId));
            }
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (eventType != null) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (severity != null) {
                predicates.add(cb.equal(root.get("severity"), severity));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), endDate));
            }
            if (StringUtils.hasText(search)) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Join<Object, Object> deviceJoin = root.join("device", JoinType.LEFT);
                Join<Object, Object> employeeJoin = deviceJoin.join("employee", JoinType.LEFT);

                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("source")), pattern),
                        cb.like(cb.lower(root.get("detailsJson")), pattern),
                        cb.like(cb.lower(deviceJoin.get("hostname")), pattern),
                        cb.like(cb.lower(deviceJoin.get("deviceCode")), pattern),
                        cb.like(cb.lower(employeeJoin.get("fullName")), pattern),
                        cb.like(cb.lower(employeeJoin.get("employeeCode")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<EndpointEvent> page = endpointEventRepository.findAll(spec, pageable);
        return page.map(this::mapToEventResponse);
    }

    @Transactional(readOnly = true)
    public EventResponse getEventById(UUID id) {
        EndpointEvent event = endpointEventRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Endpoint event not found with ID: " + id));
        return mapToEventResponse(event);
    }

    @Transactional(readOnly = true)
    public Page<EventResponse> getEventsByDeviceId(UUID deviceId, Pageable pageable) {
        Page<EndpointEvent> page = endpointEventRepository.findByDeviceIdWithDetails(deviceId, pageable);
        return page.map(this::mapToEventResponse);
    }

    @Transactional(readOnly = true)
    public EventStatsResponse getEventStats() {
        long total = endpointEventRepository.count();
        long processCount = endpointEventRepository.countByCategory(EventCategory.PROCESS);
        long usbCount = endpointEventRepository.countByCategory(EventCategory.USB);
        long clipboardCount = endpointEventRepository.countByCategory(EventCategory.CLIPBOARD);
        long screenRecCount = endpointEventRepository.countByCategory(EventCategory.SCREEN_RECORDING);
        long screenShareCount = endpointEventRepository.countByCategory(EventCategory.SCREEN_SHARING);

        LocalDateTime last24h = LocalDateTime.now().minusHours(24);
        long recent24h = endpointEventRepository.countRecentEvents(last24h);

        Map<String, Long> categoryMap = new HashMap<>();
        categoryMap.put("PROCESS", processCount);
        categoryMap.put("USB", usbCount);
        categoryMap.put("CLIPBOARD", clipboardCount);
        categoryMap.put("SCREEN_RECORDING", screenRecCount);
        categoryMap.put("SCREEN_SHARING", screenShareCount);

        return EventStatsResponse.builder()
                .totalEvents(total)
                .processEvents(processCount)
                .usbEvents(usbCount)
                .clipboardEvents(clipboardCount)
                .screenRecordingEvents(screenRecCount)
                .screenSharingEvents(screenShareCount)
                .recentEvents24h(recent24h)
                .categoryBreakdown(categoryMap)
                .build();
    }

    public EventResponse mapToEventResponse(EndpointEvent e) {
        Map<String, Object> details = Collections.emptyMap();
        if (StringUtils.hasText(e.getDetailsJson())) {
            try {
                details = objectMapper.readValue(e.getDetailsJson(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ex) {
                log.debug("Error parsing detailsJson for event {}: {}", e.getId(), ex.getMessage());
            }
        }

        return EventResponse.builder()
                .id(e.getId())
                .eventUuid(e.getEventUuid())
                .deviceId(e.getDevice() != null ? e.getDevice().getId() : null)
                .deviceCode(e.getDevice() != null ? e.getDevice().getDeviceCode() : null)
                .hostname(e.getDevice() != null ? e.getDevice().getHostname() : null)
                .employeeId(e.getDevice() != null && e.getDevice().getEmployee() != null
                        ? e.getDevice().getEmployee().getId() : null)
                .employeeCode(e.getDevice() != null && e.getDevice().getEmployee() != null
                        ? e.getDevice().getEmployee().getEmployeeCode() : null)
                .employeeName(e.getDevice() != null && e.getDevice().getEmployee() != null
                        ? e.getDevice().getEmployee().getFullName() : null)
                .departmentName(e.getDevice() != null && e.getDevice().getEmployee() != null && e.getDevice().getEmployee().getDepartment() != null
                        ? e.getDevice().getEmployee().getDepartment().getName() : null)
                .eventType(e.getEventType())
                .category(e.getCategory())
                .severity(e.getSeverity())
                .occurredAt(e.getOccurredAt())
                .receivedAt(e.getReceivedAt())
                .source(e.getSource())
                .details(details)
                .build();
    }
}
