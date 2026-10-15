package com.sentinelguard.service;

import com.sentinelguard.dto.EnrollmentTokenCreateRequest;
import com.sentinelguard.dto.EnrollmentTokenResponse;
import com.sentinelguard.entity.Employee;
import com.sentinelguard.entity.EmployeeStatus;
import com.sentinelguard.entity.EnrollmentToken;
import com.sentinelguard.exception.InvalidTokenException;
import com.sentinelguard.repository.EnrollmentTokenRepository;
import com.sentinelguard.security.CryptoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EnrollmentTokenService {

    private final EnrollmentTokenRepository enrollmentTokenRepository;
    private final EmployeeService employeeService;

    @Value("${app.enrollment.token-expiry-minutes:15}")
    private int tokenExpiryMinutes;

    @Transactional
    public EnrollmentTokenResponse createEnrollmentToken(EnrollmentTokenCreateRequest request) {
        Employee employee = employeeService.getEmployeeEntity(request.getEmployeeId());

        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new InvalidTokenException("Cannot issue enrollment token for inactive employee: " + employee.getEmployeeCode());
        }

        // Generate 256-bit cryptographically secure random token (64 hex characters)
        String plaintextToken = CryptoUtil.generateSecureToken();
        String tokenHash = CryptoUtil.sha256Hex(plaintextToken);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(tokenExpiryMinutes);

        EnrollmentToken enrollmentToken = new EnrollmentToken();
        enrollmentToken.setEmployee(employee);
        enrollmentToken.setTokenHash(tokenHash);
        enrollmentToken.setExpiresAt(expiresAt);

        EnrollmentToken saved = enrollmentTokenRepository.save(enrollmentToken);

        log.info("Generated enrollment token for employee '{}' (tokenId={}, expiresAt={})",
                employee.getEmployeeCode(), saved.getId(), expiresAt);
        // Note: plaintextToken is NEVER logged.

        return EnrollmentTokenResponse.builder()
                .tokenId(saved.getId())
                .employeeId(employee.getId())
                .employeeCode(employee.getEmployeeCode())
                .employeeName(employee.getFullName())
                .enrollmentToken(plaintextToken)
                .expiresAt(expiresAt)
                .createdAt(now)
                .build();
    }
}
