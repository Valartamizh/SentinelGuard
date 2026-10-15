package com.sentinelguard.security;

import com.sentinelguard.entity.AdminUser;
import com.sentinelguard.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.bootstrap-username:}")
    private String bootstrapUsername;

    @Value("${app.admin.bootstrap-password:}")
    private String bootstrapPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (adminUserRepository.count() == 0) {
            if (StringUtils.hasText(bootstrapUsername) && StringUtils.hasText(bootstrapPassword)) {
                log.info("No admin accounts detected. Bootstrapping initial admin account: '{}'", bootstrapUsername);
                AdminUser admin = new AdminUser();
                admin.setUsername(bootstrapUsername.trim());
                admin.setPasswordHash(passwordEncoder.encode(bootstrapPassword));
                adminUserRepository.save(admin);
                log.info("Initial admin account created successfully.");
            } else {
                log.warn("No admin accounts exist and ADMIN_USERNAME / ADMIN_PASSWORD are not configured!");
            }
        } else {
            log.info("Existing administrator account(s) detected. Bootstrap skipped.");
        }
    }
}
