package com.sentinelguard.service;

import com.sentinelguard.dto.AgentEnrollmentRequest;
import com.sentinelguard.dto.AgentEnrollmentResponse;
import com.sentinelguard.dto.AgentHeartbeatRequest;
import com.sentinelguard.dto.AgentHeartbeatResponse;
import com.sentinelguard.entity.*;
import com.sentinelguard.exception.InvalidTokenException;
import com.sentinelguard.exception.UnauthorizedAgentException;
import com.sentinelguard.repository.DeviceCredentialRepository;
import com.sentinelguard.repository.DeviceHeartbeatRepository;
import com.sentinelguard.repository.DeviceRepository;
import com.sentinelguard.repository.EnrollmentTokenRepository;
import com.sentinelguard.security.CryptoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentService {

    private final EnrollmentTokenRepository enrollmentTokenRepository;
    private final DeviceRepository deviceRepository;
    private final DeviceCredentialRepository deviceCredentialRepository;
    private final DeviceHeartbeatRepository deviceHeartbeatRepository;

    @Transactional
    public AgentEnrollmentResponse enrollDevice(AgentEnrollmentRequest request) {
        String rawToken = request.getEnrollmentToken().trim();
        String tokenHash = CryptoUtil.sha256Hex(rawToken);

        // Atomically query with pessimistic write lock to prevent simultaneous token reuse
        EnrollmentToken token = enrollmentTokenRepository.findByTokenHashForUpdate(tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Invalid enrollment token"));

        if (token.isExpired()) {
            throw new InvalidTokenException("Enrollment token has expired");
        }
        if (token.isUsed()) {
            throw new InvalidTokenException("Enrollment token has already been used");
        }
        if (token.isRevoked()) {
            throw new InvalidTokenException("Enrollment token has been revoked");
        }

        Employee employee = token.getEmployee();
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new InvalidTokenException("Employee account is inactive");
        }

        // Consume the token atomically
        token.setUsedAt(LocalDateTime.now());
        enrollmentTokenRepository.save(token);

        // Create the device record
        String deviceCode;
        do {
            deviceCode = CryptoUtil.generateDeviceCode();
        } while (deviceRepository.existsByDeviceCode(deviceCode));

        LocalDateTime now = LocalDateTime.now();
        Device device = new Device();
        device.setDeviceCode(deviceCode);
        device.setEmployee(employee);
        device.setHostname(request.getHostname().trim());
        device.setOperatingSystem(request.getOperatingSystem());
        device.setOsVersion(request.getOsVersion());
        device.setAgentVersion(request.getAgentVersion());
        device.setStatus(DeviceStatus.ACTIVE);
        device.setRegisteredAt(now);
        device.setLastSeenAt(now);

        Device savedDevice = deviceRepository.save(device);

        // Generate cryptographically secure device credential (256-bit entropy)
        String plaintextCredential = CryptoUtil.generateSecureToken();
        String credentialHash = CryptoUtil.sha256Hex(plaintextCredential);

        DeviceCredential credential = new DeviceCredential();
        credential.setDevice(savedDevice);
        credential.setCredentialHash(credentialHash);
        credential.setLastUsedAt(now);
        deviceCredentialRepository.save(credential);

        // Save initial heartbeat
        DeviceHeartbeat initialHeartbeat = new DeviceHeartbeat();
        initialHeartbeat.setDevice(savedDevice);
        initialHeartbeat.setReceivedAt(now);
        initialHeartbeat.setAgentVersion(request.getAgentVersion());
        initialHeartbeat.setStatus("ENROLLED");
        deviceHeartbeatRepository.save(initialHeartbeat);

        log.info("Device '{}' (ID: {}, Hostname: '{}') enrolled successfully for employee '{}'",
                savedDevice.getDeviceCode(), savedDevice.getId(), savedDevice.getHostname(), employee.getEmployeeCode());

        return AgentEnrollmentResponse.builder()
                .deviceId(savedDevice.getId())
                .deviceCode(savedDevice.getDeviceCode())
                .deviceCredential(plaintextCredential)
                .status(savedDevice.getStatus().name())
                .registeredAt(savedDevice.getRegisteredAt())
                .build();
    }

    @Transactional
    public AgentHeartbeatResponse processHeartbeat(String authorizationHeader, AgentHeartbeatRequest request) {
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

        // Validate payload deviceId matches authenticated credential
        if (!device.getId().equals(request.getDeviceId())) {
            log.warn("Device ID mismatch: payload ID '{}' vs credential device ID '{}'",
                    request.getDeviceId(), device.getId());
            throw new UnauthorizedAgentException("Device ID mismatch with credential");
        }

        // Validate device status
        if (device.getStatus() != DeviceStatus.ACTIVE) {
            log.warn("Heartbeat rejected for device '{}': status is {}", device.getDeviceCode(), device.getStatus());
            throw new UnauthorizedAgentException("Device is not in ACTIVE state (current status: " + device.getStatus() + ")");
        }

        // Server authoritative time
        LocalDateTime now = LocalDateTime.now();

        device.setLastSeenAt(now);
        if (StringUtils.hasText(request.getAgentVersion())) {
            device.setAgentVersion(request.getAgentVersion());
        }
        if (StringUtils.hasText(request.getMonitoringStatus())) {
            device.setMonitoringStatus(request.getMonitoringStatus());
        }
        if (StringUtils.hasText(request.getProcessMonitorStatus())) {
            device.setProcessMonitorStatus(request.getProcessMonitorStatus());
        }
        if (StringUtils.hasText(request.getUsbMonitorStatus())) {
            device.setUsbMonitorStatus(request.getUsbMonitorStatus());
        }
        if (StringUtils.hasText(request.getClipboardMonitorStatus())) {
            device.setClipboardMonitorStatus(request.getClipboardMonitorStatus());
        }
        if (StringUtils.hasText(request.getScreenMonitorStatus())) {
            device.setScreenMonitorStatus(request.getScreenMonitorStatus());
        }
        if (request.getQueuePendingCount() != null) {
            device.setQueuePendingCount(request.getQueuePendingCount());
        }
        if (StringUtils.hasText(request.getMonitoringErrors())) {
            device.setMonitoringErrors(request.getMonitoringErrors());
        }
        deviceRepository.save(device);

        deviceCredential.setLastUsedAt(now);
        deviceCredentialRepository.save(deviceCredential);

        DeviceHeartbeat heartbeat = new DeviceHeartbeat();
        heartbeat.setDevice(device);
        heartbeat.setReceivedAt(now);
        heartbeat.setAgentVersion(request.getAgentVersion());
        heartbeat.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "RUNNING");
        deviceHeartbeatRepository.save(heartbeat);

        log.debug("Heartbeat accepted for device '{}' at {}", device.getDeviceCode(), now);

        return AgentHeartbeatResponse.builder()
                .status("ACCEPTED")
                .serverTime(now)
                .build();
    }
}
