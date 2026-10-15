package com.sentinelguard.service;

import com.sentinelguard.dto.HealthResponse;
import org.springframework.stereotype.Service;

/**
 * Default implementation of {@link HealthService}.
 *
 * <p>Phase 1 — returns a static "UP" response.
 * Future phases may add real database ping checks, dependent service checks, etc.
 */
@Service
public class HealthServiceImpl implements HealthService {

    @Override
    public HealthResponse getHealth() {
        return HealthResponse.up();
    }
}
