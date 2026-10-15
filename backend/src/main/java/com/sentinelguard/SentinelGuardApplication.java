package com.sentinelguard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SentinelGuard Backend — main entry point.
 *
 * <p>Phase 1: Provides a health endpoint and connects to PostgreSQL.
 * Future phases will add event ingestion, employee management, and AI integration.
 */
@EnableScheduling
@SpringBootApplication
public class SentinelGuardApplication {

    public static void main(String[] args) {
        SpringApplication.run(SentinelGuardApplication.class, args);
    }
}
