package com.sentinelguard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinelguard.dto.*;
import com.sentinelguard.entity.*;
import com.sentinelguard.exception.ConflictException;
import com.sentinelguard.exception.InvalidTokenException;
import com.sentinelguard.exception.UnauthorizedAgentException;
import com.sentinelguard.repository.*;
import com.sentinelguard.security.CryptoUtil;
import com.sentinelguard.security.JwtService;
import com.sentinelguard.service.*;
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
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EnrollmentAndHeartbeatTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private DepartmentService departmentService;
    @Autowired private EmployeeService employeeService;
    @Autowired private EnrollmentTokenService enrollmentTokenService;
    @Autowired private AgentService agentService;
    @Autowired private DeviceAdminService deviceAdminService;
    @Autowired private JwtService jwtService;

    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private EnrollmentTokenRepository enrollmentTokenRepository;
    @Autowired private DeviceRepository deviceRepository;
    @Autowired private DeviceCredentialRepository deviceCredentialRepository;
    @Autowired private DeviceHeartbeatRepository deviceHeartbeatRepository;

    private Department department;
    private Employee employee;

    @BeforeEach
    void setUp() {
        deviceHeartbeatRepository.deleteAll();
        deviceCredentialRepository.deleteAll();
        deviceRepository.deleteAll();
        enrollmentTokenRepository.deleteAll();
        employeeRepository.deleteAll();
        departmentRepository.deleteAll();

        DepartmentRequest deptReq = new DepartmentRequest("Engineering");
        DepartmentResponse deptResp = departmentService.createDepartment(deptReq);
        department = departmentService.getDepartmentEntity(deptResp.getId());

        EmployeeRequest empReq = new EmployeeRequest("EMP-100", "Alice Smith", department.getId(), EmployeeStatus.ACTIVE);
        EmployeeResponse empResp = employeeService.createEmployee(empReq);
        employee = employeeService.getEmployeeEntity(empResp.getId());
    }

    @Test
    @DisplayName("1. Employee creation succeeds")
    void testEmployeeCreation() {
        assertNotNull(employee.getId());
        assertEquals("EMP-100", employee.getEmployeeCode());
        assertEquals("Alice Smith", employee.getFullName());
        assertEquals(EmployeeStatus.ACTIVE, employee.getStatus());
    }

    @Test
    @DisplayName("2. Duplicate employee code is rejected")
    void testDuplicateEmployeeCodeRejected() {
        EmployeeRequest duplicateReq = new EmployeeRequest("EMP-100", "Another Alice", department.getId(), EmployeeStatus.ACTIVE);
        assertThrows(ConflictException.class, () -> employeeService.createEmployee(duplicateReq));
    }

    @Test
    @DisplayName("3. Enrollment token expiration is enforced")
    void testEnrollmentTokenExpiration() {
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(employee.getId())
        );

        // Manually expire token in database
        EnrollmentToken tokenEntity = enrollmentTokenRepository.findById(tokenResp.getTokenId()).orElseThrow();
        tokenEntity.setExpiresAt(LocalDateTime.now().minusMinutes(5));
        enrollmentTokenRepository.save(tokenEntity);

        AgentEnrollmentRequest enrollReq = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "LAPTOP-01", "Windows", "Windows 11", "1.0.0"
        );

        assertThrows(InvalidTokenException.class, () -> agentService.enrollDevice(enrollReq));
    }

    @Test
    @DisplayName("4. One-time token consumption prevents reuse")
    void testOneTimeTokenConsumption() {
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(employee.getId())
        );

        AgentEnrollmentRequest enrollReq1 = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "LAPTOP-01", "Windows", "Windows 11", "1.0.0"
        );
        AgentEnrollmentResponse enrollResp1 = agentService.enrollDevice(enrollReq1);
        assertNotNull(enrollResp1.getDeviceId());
        assertNotNull(enrollResp1.getDeviceCredential());

        // Second attempt with same token must fail
        AgentEnrollmentRequest enrollReq2 = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "LAPTOP-02", "Windows", "Windows 11", "1.0.0"
        );
        assertThrows(InvalidTokenException.class, () -> agentService.enrollDevice(enrollReq2));
    }

    @Test
    @DisplayName("5. Concurrent enrollment attempts with same token allow only one to succeed")
    void testConcurrentEnrollment() throws InterruptedException {
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(employee.getId())
        );

        int threads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    AgentEnrollmentRequest req = new AgentEnrollmentRequest(
                            tokenResp.getEnrollmentToken(), "LAPTOP-" + index, "Windows", "Windows 11", "1.0.0"
                    );
                    agentService.enrollDevice(req);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS));

        assertEquals(1, successCount.get(), "Exactly one concurrent enrollment must succeed");
        assertEquals(threads - 1, failureCount.get(), "All other concurrent attempts must be rejected");
    }

    @Test
    @DisplayName("6. Invalid enrollment token is rejected")
    void testInvalidEnrollmentToken() {
        AgentEnrollmentRequest enrollReq = new AgentEnrollmentRequest(
                "non-existent-fake-token-string-1234567890", "LAPTOP-01", "Windows", "Windows 11", "1.0.0"
        );
        assertThrows(InvalidTokenException.class, () -> agentService.enrollDevice(enrollReq));
    }

    @Test
    @DisplayName("7. Device credential authentication succeeds for active device")
    void testDeviceCredentialAuthentication() {
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(employee.getId())
        );

        AgentEnrollmentRequest enrollReq = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "LAPTOP-01", "Windows", "Windows 11", "1.0.0"
        );
        AgentEnrollmentResponse enrollResp = agentService.enrollDevice(enrollReq);

        AgentHeartbeatRequest hbReq = new AgentHeartbeatRequest(enrollResp.getDeviceId(), "1.0.0", "RUNNING");
        AgentHeartbeatResponse hbResp = agentService.processHeartbeat("Bearer " + enrollResp.getDeviceCredential(), hbReq);

        assertEquals("ACCEPTED", hbResp.getStatus());
        assertNotNull(hbResp.getServerTime());
    }

    @Test
    @DisplayName("8. Heartbeat rejected for revoked device")
    void testHeartbeatRejectedForRevokedDevice() {
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(employee.getId())
        );

        AgentEnrollmentRequest enrollReq = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "LAPTOP-01", "Windows", "Windows 11", "1.0.0"
        );
        AgentEnrollmentResponse enrollResp = agentService.enrollDevice(enrollReq);

        // Revoke the device
        deviceAdminService.revokeDevice(enrollResp.getDeviceId());

        AgentHeartbeatRequest hbReq = new AgentHeartbeatRequest(enrollResp.getDeviceId(), "1.0.0", "RUNNING");
        assertThrows(UnauthorizedAgentException.class, () ->
                agentService.processHeartbeat("Bearer " + enrollResp.getDeviceCredential(), hbReq)
        );
    }

    @Test
    @DisplayName("9. Device ID mismatch is rejected")
    void testDeviceIdMismatch() {
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(employee.getId())
        );

        AgentEnrollmentRequest enrollReq = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "LAPTOP-01", "Windows", "Windows 11", "1.0.0"
        );
        AgentEnrollmentResponse enrollResp = agentService.enrollDevice(enrollReq);

        // Send heartbeat with arbitrary different deviceId
        AgentHeartbeatRequest mismatchReq = new AgentHeartbeatRequest(UUID.randomUUID(), "1.0.0", "RUNNING");
        assertThrows(UnauthorizedAgentException.class, () ->
                agentService.processHeartbeat("Bearer " + enrollResp.getDeviceCredential(), mismatchReq)
        );
    }

    @Test
    @DisplayName("10. ONLINE/OFFLINE connectivity is dynamically calculated")
    void testOnlineOfflineCalculation() {
        EnrollmentTokenResponse tokenResp = enrollmentTokenService.createEnrollmentToken(
                new EnrollmentTokenCreateRequest(employee.getId())
        );

        AgentEnrollmentRequest enrollReq = new AgentEnrollmentRequest(
                tokenResp.getEnrollmentToken(), "LAPTOP-01", "Windows", "Windows 11", "1.0.0"
        );
        AgentEnrollmentResponse enrollResp = agentService.enrollDevice(enrollReq);

        Device device = deviceRepository.findById(enrollResp.getDeviceId()).orElseThrow();
        LocalDateTime now = LocalDateTime.now();

        // 10 seconds ago -> ONLINE
        device.setLastSeenAt(now.minusSeconds(10));
        assertEquals("ONLINE", deviceAdminService.computeConnectivityStatus(device, now));

        // 120 seconds ago -> OFFLINE
        device.setLastSeenAt(now.minusSeconds(120));
        assertEquals("OFFLINE", deviceAdminService.computeConnectivityStatus(device, now));

        // Revoked status always displays REVOKED
        device.setStatus(DeviceStatus.REVOKED);
        device.setLastSeenAt(now.minusSeconds(5));
        assertEquals("REVOKED", deviceAdminService.computeConnectivityStatus(device, now));
    }

    @Test
    @DisplayName("11. Unauthorized administrative access is rejected with 401")
    void testUnauthorizedAdminAccess() throws Exception {
        // Without JWT header -> 401
        mockMvc.perform(get("/api/v1/admin/employees"))
                .andExpect(status().isUnauthorized());

        // With valid JWT header -> 200
        String adminToken = jwtService.generateToken("admin", "ROLE_ADMIN");
        mockMvc.perform(get("/api/v1/admin/employees")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}
