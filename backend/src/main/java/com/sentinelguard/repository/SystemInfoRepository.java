package com.sentinelguard.repository;

import com.sentinelguard.entity.SystemInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link SystemInfo}.
 *
 * <p>Phase 1 — no custom queries needed. Standard CRUD is inherited.
 */
@Repository
public interface SystemInfoRepository extends JpaRepository<SystemInfo, Long> {
}
