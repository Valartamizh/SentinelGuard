package com.sentinelguard.controller;

import com.sentinelguard.dto.DashboardSummaryResponse;
import com.sentinelguard.dto.DeviceDetailResponse;
import com.sentinelguard.dto.DeviceResponse;
import com.sentinelguard.service.DeviceAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/devices")
@RequiredArgsConstructor
@Tag(name = "Admin - Devices", description = "Device inventory and lifecycle administration")
@SecurityRequirement(name = "BearerAuth")
public class AdminDeviceController {

    private final DeviceAdminService deviceAdminService;

    @GetMapping
    @Operation(summary = "List all devices", description = "Retrieves all registered devices with real-time connectivity status (ONLINE/OFFLINE/REVOKED/RETIRED)")
    public ResponseEntity<List<DeviceResponse>> getAllDevices() {
        return ResponseEntity.ok(deviceAdminService.getAllDevices());
    }

    @GetMapping("/summary")
    @Operation(summary = "Dashboard summary", description = "Returns actual device and employee counts for dashboard cards")
    public ResponseEntity<DashboardSummaryResponse> getDashboardSummary() {
        return ResponseEntity.ok(deviceAdminService.getDashboardSummary());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get device details", description = "Retrieves device details including recent heartbeat telemetry history")
    public ResponseEntity<DeviceDetailResponse> getDeviceById(@PathVariable UUID id) {
        return ResponseEntity.ok(deviceAdminService.getDeviceById(id));
    }

    @PostMapping("/{id}/revoke")
    @Operation(summary = "Revoke device", description = "Revokes device access and invalidates all active device credentials immediately")
    public ResponseEntity<DeviceResponse> revokeDevice(@PathVariable UUID id) {
        return ResponseEntity.ok(deviceAdminService.revokeDevice(id));
    }
}
