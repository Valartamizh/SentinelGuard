import { apiClient } from './apiClient';

export const authApi = {
  async login(username, password) {
    const response = await apiClient.post('/auth/login', { username, password });
    const { token, username: user } = response.data;
    localStorage.setItem('sentinel_admin_token', token);
    localStorage.setItem('sentinel_admin_user', user);
    window.dispatchEvent(new Event('sentinel_auth_change'));
    return response.data;
  },

  logout() {
    localStorage.removeItem('sentinel_admin_token');
    localStorage.removeItem('sentinel_admin_user');
    window.dispatchEvent(new Event('sentinel_auth_change'));
  },

  isAuthenticated() {
    return !!localStorage.getItem('sentinel_admin_token');
  },

  getToken() {
    return localStorage.getItem('sentinel_admin_token');
  },

  getUsername() {
    return localStorage.getItem('sentinel_admin_user') || 'Administrator';
  }
};
