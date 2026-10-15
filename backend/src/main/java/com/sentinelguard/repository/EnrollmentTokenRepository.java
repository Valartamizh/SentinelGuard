package com.sentinelguard.repository;

import com.sentinelguard.entity.EnrollmentToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnrollmentTokenRepository extends JpaRepository<EnrollmentToken, UUID> {

    Optional<EnrollmentToken> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM EnrollmentToken t JOIN FETCH t.employee WHERE t.tokenHash = :tokenHash")
    Optional<EnrollmentToken> findByTokenHashForUpdate(String tokenHash);

    List<EnrollmentToken> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);
}
