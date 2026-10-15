package com.sentinelguard.service;

import com.sentinelguard.dto.*;
import com.sentinelguard.entity.Device;
import com.sentinelguard.entity.DeviceCredential;
import com.sentinelguard.entity.DeviceHeartbeat;
import com.sentinelguard.entity.DeviceStatus;
import com.sentinelguard.exception.ResourceNotFoundException;
import com.sentinelguard.repository.DeviceCredentialRepository;
import com.sentinelguard.repository.DeviceHeartbeatRepository;
import com.sentinelguard.repository.DeviceRepository;
import com.sentinelguard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceAdminService {

    private final DeviceRepository deviceRepository;
    private final DeviceCredentialRepository deviceCredentialRepository;
    private final DeviceHeartbeatRepository deviceHeartbeatRepository;
    private final EmployeeRepository employeeRepository;

    @Value("${app.heartbeat.online-threshold-seconds:90}")
    private int onlineThresholdSeconds;

    @Transactional(readOnly = true)
    public List<DeviceResponse> getAllDevices() {
        LocalDateTime now = LocalDateTime.now();
        return deviceRepository.findAllWithEmployee().stream()
                .map(d -> mapToDeviceResponse(d, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public DeviceDetailResponse getDeviceById(UUID id) {
        Device device = deviceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with ID: " + id));

        LocalDateTime now = LocalDateTime.now();
        String connectivity = computeConnectivityStatus(device, now);

        List<HeartbeatRecordDto> recentHeartbeats = deviceHeartbeatRepository
                .findRecentByDeviceId(id, PageRequest.of(0, 20))
                .stream()
                .map(this::mapToHeartbeatDto)
                .toList();

        return DeviceDetailResponse.builder()
                .id(device.getId())
                .deviceCode(device.getDeviceCode())
                .hostname(device.getHostname())
                .operatingSystem(device.getOperatingSystem())
                .osVersion(device.getOsVersion())
                .agentVersion(device.getAgentVersion())
                .lifecycleStatus(device.getStatus())
                .connectivityStatus(connectivity)
                .registeredAt(device.getRegisteredAt())
                .lastSeenAt(device.getLastSeenAt())
                .employeeId(device.getEmployee().getId())
                .employeeCode(device.getEmployee().getEmployeeCode())
                .employeeName(device.getEmployee().getFullName())
                .departmentName(device.getEmployee().getDepartment().getName())
                .recentHeartbeats(recentHeartbeats)
                .monitoringStatus(device.getMonitoringStatus() != null ? device.getMonitoringStatus() : "MONITORING_ACTIVE")
                .processMonitorStatus(device.getProcessMonitorStatus() != null ? device.getProcessMonitorStatus() : "ACTIVE")
                .usbMonitorStatus(device.getUsbMonitorStatus() != null ? device.getUsbMonitorStatus() : "ACTIVE")
                .clipboardMonitorStatus(device.getClipboardMonitorStatus() != null ? device.getClipboardMonitorStatus() : "ACTIVE")
                .screenMonitorStatus(device.getScreenMonitorStatus() != null ? device.getScreenMonitorStatus() : "ACTIVE")
                .queuePendingCount(device.getQueuePendingCount() != null ? device.getQueuePendingCount() : 0)
                .lastEventUploadAt(device.getLastEventUploadAt())
                .monitoringErrors(device.getMonitoringErrors())
                .build();
    }

    @Transactional
    public DeviceResponse revokeDevice(UUID id) {
        Device device = deviceRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with ID: " + id));

        device.setStatus(DeviceStatus.REVOKED);
        Device saved = deviceRepository.save(device);

        // Invalidate active credentials immediately
        LocalDateTime now = LocalDateTime.now();
        List<DeviceCredential> credentials = deviceCredentialRepository.findByDeviceIdAndRevokedAtIsNull(id);
        for (DeviceCredential cred : credentials) {
            cred.setRevokedAt(now);
            deviceCredentialRepository.save(cred);
        }

        log.info("Device '{}' ({}) has been revoked by administrator", saved.getDeviceCode(), saved.getId());
        return mapToDeviceResponse(saved, now);
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        LocalDateTime now = LocalDateTime.now();
        List<Device> devices = deviceRepository.findAll();

        long totalDevices = devices.size();
        long onlineCount = 0;
        long offlineCount = 0;
        long revokedCount = 0;

        for (Device d : devices) {
            if (d.getStatus() == DeviceStatus.REVOKED) {
                revokedCount++;
            } else if (d.getStatus() == DeviceStatus.ACTIVE) {
                if (isOnline(d, now)) {
                    onlineCount++;
                } else {
                    offlineCount++;
                }
            } else {
                offlineCount++;
            }
        }

        long totalEmployees = employeeRepository.count();

        return DashboardSummaryResponse.builder()
                .totalDevices(totalDevices)
                .onlineDevices(onlineCount)
                .offlineDevices(offlineCount)
                .revokedDevices(revokedCount)
                .totalEmployees(totalEmployees)
                .build();
    }

    public boolean isOnline(Device device, LocalDateTime now) {
        if (device.getStatus() != DeviceStatus.ACTIVE) {
            return false;
        }
        if (device.getLastSeenAt() == null) {
            return false;
        }
        return device.getLastSeenAt().isAfter(now.minusSeconds(onlineThresholdSeconds));
    }

    public String computeConnectivityStatus(Device device, LocalDateTime now) {
        if (device.getStatus() == DeviceStatus.REVOKED) {
            return "REVOKED";
        }
        if (device.getStatus() == DeviceStatus.RETIRED) {
            return "RETIRED";
        }
        return isOnline(device, now) ? "ONLINE" : "OFFLINE";
    }

    private DeviceResponse mapToDeviceResponse(Device d, LocalDateTime now) {
        return DeviceResponse.builder()
                .id(d.getId())
                .deviceCode(d.getDeviceCode())
                .hostname(d.getHostname())
                .operatingSystem(d.getOperatingSystem())
                .osVersion(d.getOsVersion())
                .agentVersion(d.getAgentVersion())
                .lifecycleStatus(d.getStatus())
                .connectivityStatus(computeConnectivityStatus(d, now))
                .registeredAt(d.getRegisteredAt())
                .lastSeenAt(d.getLastSeenAt())
                .employeeId(d.getEmployee() != null ? d.getEmployee().getId() : null)
                .employeeCode(d.getEmployee() != null ? d.getEmployee().getEmployeeCode() : null)
                .employeeName(d.getEmployee() != null ? d.getEmployee().getFullName() : null)
                .departmentName(d.getEmployee() != null && d.getEmployee().getDepartment() != null ? d.getEmployee().getDepartment().getName() : null)
                .build();
    }

    private HeartbeatRecordDto mapToHeartbeatDto(DeviceHeartbeat h) {
        return HeartbeatRecordDto.builder()
                .id(h.getId())
                .receivedAt(h.getReceivedAt())
                .agentVersion(h.getAgentVersion())
                .status(h.getStatus())
                .build();
    }
}
