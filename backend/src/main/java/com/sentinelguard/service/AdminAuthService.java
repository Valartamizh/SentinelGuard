package com.sentinelguard.service;

import com.sentinelguard.dto.AdminLoginRequest;
import com.sentinelguard.dto.AdminLoginResponse;
import com.sentinelguard.entity.AdminUser;
import com.sentinelguard.repository.AdminUserRepository;
import com.sentinelguard.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public AdminLoginResponse login(AdminLoginRequest request) {
        AdminUser admin = adminUserRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            log.warn("Failed login attempt for username: '{}'", request.getUsername());
            throw new BadCredentialsException("Invalid username or password");
        }

        String token = jwtService.generateToken(admin.getUsername(), "ROLE_ADMIN");
        log.info("Administrator '{}' logged in successfully", admin.getUsername());

        return AdminLoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .username(admin.getUsername())
                .expiresInMs(jwtService.getExpirationMs())
                .build();
    }
}
