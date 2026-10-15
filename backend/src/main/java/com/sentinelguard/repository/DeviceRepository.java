package com.sentinelguard.repository;

import com.sentinelguard.entity.Device;
import com.sentinelguard.entity.DeviceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {
    Optional<Device> findByDeviceCode(String deviceCode);
    boolean existsByDeviceCode(String deviceCode);
    List<Device> findByEmployeeId(UUID employeeId);
    long countByStatus(DeviceStatus status);

    @Query("SELECT d FROM Device d JOIN FETCH d.employee e JOIN FETCH e.department ORDER BY d.createdAt DESC")
    List<Device> findAllWithEmployee();

    @Query(value = "SELECT d FROM Device d JOIN FETCH d.employee e JOIN FETCH e.department",
           countQuery = "SELECT COUNT(d) FROM Device d")
    Page<Device> findAllWithEmployee(Pageable pageable);

    @Query("SELECT d FROM Device d JOIN FETCH d.employee e JOIN FETCH e.department WHERE d.id = :id")
    Optional<Device> findByIdWithDetails(UUID id);
}
