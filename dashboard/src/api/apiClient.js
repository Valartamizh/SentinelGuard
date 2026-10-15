import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token to administrative requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sentinel_admin_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear expired credentials
      const path = error.config?.url || '';
      if (!path.includes('/auth/login')) {
        localStorage.removeItem('sentinel_admin_token');
        localStorage.removeItem('sentinel_admin_user');
        window.dispatchEvent(new Event('sentinel_auth_change'));
      }
    }
    return Promise.reject(error);
  }
);
