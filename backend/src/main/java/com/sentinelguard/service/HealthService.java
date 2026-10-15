package com.sentinelguard.service;

import com.sentinelguard.dto.HealthResponse;

/**
 * Service interface for health-related operations.
 *
 * <p>Separating the interface from the implementation keeps the controller
 * decoupled and makes unit testing straightforward.
 */
public interface HealthService {

    /**
     * Returns the current health status of the backend service.
     *
     * @return a {@link HealthResponse} indicating status "UP"
     */
    HealthResponse getHealth();
}
