/**
 * API service for communicating with the SentinelGuard backend.
 *
 * All requests target the real backend at localhost:8080.
 * No mock data — if the backend is offline, status reflects that.
 */

const BASE_URL = 'http://localhost:8080/api/v1';

/**
 * Fetches the backend health status.
 *
 * @returns {{ status: string, service: string }} on success
 * @throws on network error or non-OK HTTP status
 */
export async function fetchHealth() {
  const response = await fetch(`${BASE_URL}/health`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    // Short timeout so the dashboard doesn't hang on unreachable backend
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
