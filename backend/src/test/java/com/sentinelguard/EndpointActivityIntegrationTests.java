package com.sentinelguard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelguard.dto.*;
import com.sentinelguard.entity.*;
import com.sentinelguard.repository.*;
import com.sentinelguard.security.JwtService;
import com.sentinelguard.service.AgentService;
import com.sentinelguard.service.DepartmentService;
import com.sentinelguard.service.EmployeeService;
import com.sentinelguard.service.EnrollmentTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EndpointActivityIntegrationTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DepartmentService departmentService;
    @Autowired private EmployeeService employeeService;
    @Autowired private EnrollmentTokenService enrollmentTokenService;
    @Autowired private AgentService agentService;
    @Autowired private JwtService jwtService;

    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private EnrollmentTokenRepository enrollmentTokenRepository;
    @Autowired private DeviceRepository deviceRepository;
    @Autowired private DeviceCredentialRepository deviceCredentialRepository;
    @Autowired private DeviceHeartbeatRepository deviceHeartbeatRepository;
    @Autowired private EndpointEventRepository endpointEventRepository;

    private Device activeDevice;
    private String deviceCredentialPlaintext;
    private String adminJwtToken;

    @BeforeEach
    void setUp() {
        endpointEventRepository.deleteAll();
        deviceHeartbeatRepository.deleteAll();
        deviceCredentialRepository.deleteAll();
        deviceRepository.deleteAll();
        enrollmentTokenRepository.deleteAll();
        employeeRepository.deleteAll();
        departmentRepository.deleteAll();

        // 1. Department & Employee
        DepartmentResponse dept = departmentService.createDepartment(new DepartmentRequest("SecOps"));
        EmployeeResponse emp = employeeService.createEmployee(
                new EmployeeRequest("EMP-999", "Agent Tester", dept.getId(), EmployeeStatus.ACTIVE)
        );

        // 2. Token & Device Enrollment
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(emp.getId())
        );
        AgentEnrollmentRequest enrollReq = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "SEC-DEV-01", "Windows", "10.0.22631", "1.0.0"
        );

        AgentEnrollmentResponse enrolled = agentService.enrollDevice(enrollReq);
        activeDevice = deviceRepository.findById(enrolled.getDeviceId()).orElseThrow();
        deviceCredentialPlaintext = enrolled.getDeviceCredential();

        // 3. Admin JWT
        adminJwtToken = jwtService.generateToken("admin", "ROLE_ADMIN");
    }

    @Test
    @DisplayName("Valid authenticated event batch is accepted and persisted")
    void testIngestEventBatchSuccess() throws Exception {
        UUID eventId1 = UUID.randomUUID();
        UUID eventId2 = UUID.randomUUID();

        AgentEventItem event1 = AgentEventItem.builder()
                .eventId(eventId1)
                .eventType(EventType.PROCESS_STARTED)
                .category(EventCategory.PROCESS)
                .severity(EventSeverity.INFO)
                .occurredAt(LocalDateTime.now().minusSeconds(10))
                .source("WINDOWS_AGENT")
                .details(Map.of("processName", "notepad.exe", "pid", 1234, "ppid", 4321))
                .build();

        AgentEventItem event2 = AgentEventItem.builder()
                .eventId(eventId2)
                .eventType(EventType.CLIPBOARD_CHANGED)
                .category(EventCategory.CLIPBOARD)
                .severity(EventSeverity.INFO)
                .occurredAt(LocalDateTime.now().minusSeconds(5))
                .source("WINDOWS_AGENT")
                .details(Map.of("formatCategory", "TEXT", "sequenceNumber", 9876))
                .build();

        AgentEventBatchRequest batchRequest = AgentEventBatchRequest.builder()
                .events(List.of(event1, event2))
                .monitoringStatus("MONITORING_ACTIVE")
                .processMonitorStatus("ACTIVE")
                .clipboardMonitorStatus("ACTIVE")
                .queuePendingCount(0)
                .build();

        mockMvc.perform(post("/api/v1/agent/events/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deviceCredentialPlaintext)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.processedCount").value(2))
                .andExpect(jsonPath("$.duplicateCount").value(0));

        assertEquals(2, endpointEventRepository.count());
        assertTrue(endpointEventRepository.existsByEventUuid(eventId1));
        assertTrue(endpointEventRepository.existsByEventUuid(eventId2));

        // Verify device monitoring fields updated
        Device refreshedDevice = deviceRepository.findById(activeDevice.getId()).orElseThrow();
        assertEquals("MONITORING_ACTIVE", refreshedDevice.getMonitoringStatus());
        assertEquals("ACTIVE", refreshedDevice.getProcessMonitorStatus());
        assertNotNull(refreshedDevice.getLastEventUploadAt());
    }

    @Test
    @DisplayName("Unauthenticated event batch is rejected with 401")
    void testIngestEventBatchUnauthenticated() throws Exception {
        AgentEventItem event = AgentEventItem.builder()
                .eventId(UUID.randomUUID())
                .eventType(EventType.PROCESS_STARTED)
                .category(EventCategory.PROCESS)
                .occurredAt(LocalDateTime.now())
                .build();

        AgentEventBatchRequest batchRequest = AgentEventBatchRequest.builder()
                .events(List.of(event))
                .build();

        mockMvc.perform(post("/api/v1/agent/events/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Revoked device events are rejected with 401")
    void testIngestEventBatchRevokedDevice() throws Exception {
        activeDevice.setStatus(DeviceStatus.REVOKED);
        deviceRepository.save(activeDevice);

        AgentEventItem event = AgentEventItem.builder()
                .eventId(UUID.randomUUID())
                .eventType(EventType.PROCESS_STARTED)
                .category(EventCategory.PROCESS)
                .occurredAt(LocalDateTime.now())
                .build();

        AgentEventBatchRequest batchRequest = AgentEventBatchRequest.builder()
                .events(List.of(event))
                .build();

        mockMvc.perform(post("/api/v1/agent/events/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deviceCredentialPlaintext)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Empty batch is rejected with 400 Bad Request")
    void testIngestEmptyBatchRejected() throws Exception {
        AgentEventBatchRequest emptyBatch = AgentEventBatchRequest.builder()
                .events(Collections.emptyList())
                .build();

        mockMvc.perform(post("/api/v1/agent/events/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deviceCredentialPlaintext)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyBatch)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Duplicate event UUID is safely ignored and reported in duplicateCount")
    void testDuplicateEventIgnored() throws Exception {
        UUID eventId = UUID.randomUUID();

        AgentEventItem event = AgentEventItem.builder()
                .eventId(eventId)
                .eventType(EventType.USB_CONNECTED)
                .category(EventCategory.USB)
                .severity(EventSeverity.INFO)
                .occurredAt(LocalDateTime.now().minusSeconds(2))
                .details(Map.of("driveLetter", "E:", "deviceCategory", "USB"))
                .build();

        AgentEventBatchRequest batch = AgentEventBatchRequest.builder()
                .events(List.of(event))
                .build();

        // First send
        mockMvc.perform(post("/api/v1/agent/events/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deviceCredentialPlaintext)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processedCount").value(1))
                .andExpect(jsonPath("$.duplicateCount").value(0));

        // Second send (exact same event UUID)
        mockMvc.perform(post("/api/v1/agent/events/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deviceCredentialPlaintext)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processedCount").value(0))
                .andExpect(jsonPath("$.duplicateCount").value(1));

        assertEquals(1, endpointEventRepository.count());
    }

    @Test
    @DisplayName("Administrator can query events with category filter, search, and pagination")
    void testAdminQueryEvents() throws Exception {
        UUID e1 = UUID.randomUUID();
        UUID e2 = UUID.randomUUID();
        UUID e3 = UUID.randomUUID();

        AgentEventBatchRequest batch = AgentEventBatchRequest.builder()
                .events(List.of(
                        AgentEventItem.builder()
                                .eventId(e1)
                                .eventType(EventType.PROCESS_STARTED)
                                .category(EventCategory.PROCESS)
                                .occurredAt(LocalDateTime.now().minusMinutes(3))
                                .details(Map.of("processName", "calc.exe"))
                                .build(),
                        AgentEventItem.builder()
                                .eventId(e2)
                                .eventType(EventType.APPLICATION_DETECTED)
                                .category(EventCategory.SCREEN_RECORDING)
                                .occurredAt(LocalDateTime.now().minusMinutes(2))
                                .details(Map.of("processName", "obs64.exe", "activeCaptureConfirmed", false))
                                .build(),
                        AgentEventItem.builder()
                                .eventId(e3)
                                .eventType(EventType.APPLICATION_DETECTED)
                                .category(EventCategory.SCREEN_SHARING)
                                .occurredAt(LocalDateTime.now().minusMinutes(1))
                                .details(Map.of("processName", "teams.exe", "activeCaptureConfirmed", false))
                                .build()
                ))
                .build();

        // Ingest batch
        mockMvc.perform(post("/api/v1/agent/events/batch")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deviceCredentialPlaintext)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batch)))
                .andExpect(status().isOk());

        // 1. Query all
        mockMvc.perform(get("/api/v1/events")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.content", hasSize(3)));

        // 2. Query filter by category = SCREEN_RECORDING
        mockMvc.perform(get("/api/v1/events?category=SCREEN_RECORDING")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].category").value("SCREEN_RECORDING"))
                .andExpect(jsonPath("$.content[0].details.processName").value("obs64.exe"));

        // 3. Query stats
        mockMvc.perform(get("/api/v1/events/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvents").value(3))
                .andExpect(jsonPath("$.processEvents").value(1))
                .andExpect(jsonPath("$.screenRecordingEvents").value(1))
                .andExpect(jsonPath("$.screenSharingEvents").value(1));

        // 4. Query single event by ID
        EndpointEvent savedEvent = endpointEventRepository.findByEventUuid(e1).orElseThrow();
        mockMvc.perform(get("/api/v1/events/" + savedEvent.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminJwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedEvent.getId().toString()))
                .andExpect(jsonPath("$.deviceCode").value(activeDevice.getDeviceCode()))
                .andExpect(jsonPath("$.employeeName").value("Agent Tester"));
    }

    @Test
    @DisplayName("Existing heartbeat API continues to work seamlessly with monitoring telemetry")
    void testHeartbeatStillWorks() throws Exception {
        AgentHeartbeatRequest hb = new AgentHeartbeatRequest(activeDevice.getId(), "1.0.0", "RUNNING");
        hb.setMonitoringStatus("MONITORING_ACTIVE");
        hb.setProcessMonitorStatus("ACTIVE");

        mockMvc.perform(post("/api/v1/agent/heartbeat")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + deviceCredentialPlaintext)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hb)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // Verify device updated
        Device dev = deviceRepository.findById(activeDevice.getId()).orElseThrow();
        assertEquals("MONITORING_ACTIVE", dev.getMonitoringStatus());
    }
}
