package com.sentinelguard.repository;

import com.sentinelguard.entity.DeviceCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceCredentialRepository extends JpaRepository<DeviceCredential, UUID> {

    @Query("SELECT c FROM DeviceCredential c JOIN FETCH c.device d JOIN FETCH d.employee WHERE c.credentialHash = :credentialHash AND c.revokedAt IS NULL")
    Optional<DeviceCredential> findActiveByCredentialHash(String credentialHash);

    List<DeviceCredential> findByDeviceIdAndRevokedAtIsNull(UUID deviceId);
}
