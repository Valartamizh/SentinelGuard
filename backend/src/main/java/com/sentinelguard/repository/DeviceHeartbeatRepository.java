package com.sentinelguard.repository;

import com.sentinelguard.entity.DeviceHeartbeat;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeviceHeartbeatRepository extends JpaRepository<DeviceHeartbeat, UUID> {

    @Query("SELECT h FROM DeviceHeartbeat h WHERE h.device.id = :deviceId ORDER BY h.receivedAt DESC")
    List<DeviceHeartbeat> findRecentByDeviceId(UUID deviceId, Pageable pageable);
}
