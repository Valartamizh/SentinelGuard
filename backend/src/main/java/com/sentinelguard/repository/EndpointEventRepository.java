package com.sentinelguard.repository;

import com.sentinelguard.entity.EndpointEvent;
import com.sentinelguard.entity.EventCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EndpointEventRepository extends JpaRepository<EndpointEvent, UUID>, JpaSpecificationExecutor<EndpointEvent> {

    boolean existsByEventUuid(UUID eventUuid);

    Optional<EndpointEvent> findByEventUuid(UUID eventUuid);

    @Query("SELECT e FROM EndpointEvent e " +
           "JOIN FETCH e.device d " +
           "JOIN FETCH d.employee emp " +
           "JOIN FETCH emp.department dept " +
           "WHERE e.id = :id")
    Optional<EndpointEvent> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT e FROM EndpointEvent e " +
           "JOIN FETCH e.device d " +
           "JOIN FETCH d.employee emp " +
           "JOIN FETCH emp.department dept " +
           "WHERE d.id = :deviceId " +
           "ORDER BY e.occurredAt DESC")
    Page<EndpointEvent> findByDeviceIdWithDetails(@Param("deviceId") UUID deviceId, Pageable pageable);

    long countByCategory(EventCategory category);

    @Query("SELECT COUNT(e) FROM EndpointEvent e WHERE e.occurredAt >= :since")
    long countRecentEvents(@Param("since") LocalDateTime since);
}
