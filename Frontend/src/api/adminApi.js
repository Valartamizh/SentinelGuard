import { apiClient } from './apiClient';

export const adminApi = {
  // Departments
  async getDepartments() {
    const res = await apiClient.get('/admin/departments');
    return res.data;
  },

  async createDepartment(name) {
    const res = await apiClient.post('/admin/departments', { name });
    return res.data;
  },

  // Employees
  async getEmployees() {
    const res = await apiClient.get('/admin/employees');
    return res.data;
  },

  async getEmployeeById(id) {
    const res = await apiClient.get(`/admin/employees/${id}`);
    return res.data;
  },

  async createEmployee(payload) {
    const res = await apiClient.post('/admin/employees', payload);
    return res.data;
  },

  // Enrollment Tokens
  async createEnrollmentToken(employeeId) {
    const res = await apiClient.post('/admin/enrollment-tokens', { employeeId });
    return res.data;
  },

  // Devices
  async getDevices() {
    const res = await apiClient.get('/admin/devices');
    return res.data;
  },

  async getDeviceById(id) {
    const res = await apiClient.get(`/admin/devices/${id}`);
    return res.data;
  },

  async revokeDevice(id) {
    const res = await apiClient.post(`/admin/devices/${id}/revoke`);
    return res.data;
  },

  // Summary Metrics
  async getDashboardSummary() {
    const res = await apiClient.get('/admin/devices/summary');
    return res.data;
  },

  // Endpoint Events & Telemetry
  async getEvents(params = {}) {
    const res = await apiClient.get('/events', { params });
    return res.data;
  },

  async getEventStats() {
    const res = await apiClient.get('/events/stats');
    return res.data;
  },

  async getEventById(id) {
    const res = await apiClient.get(`/events/${id}`);
    return res.data;
  },

  async getDeviceEvents(deviceId, params = {}) {
    const res = await apiClient.get(`/devices/${deviceId}/events`, { params });
    return res.data;
  }
};
