import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { Device, Alert, DeviceMetric, DeviceLog, DeviceGroup, LoginResponse } from '@/types';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add auth token
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await client.post('/auth/login', { email, password });
    return data;
  },

  register: async (email: string, password: string, name?: string): Promise<LoginResponse> => {
    const { data } = await client.post('/auth/register', { email, password, name });
    return data;
  },

  // Devices
  getDevices: async (params?: { status?: string; search?: string }): Promise<Device[]> => {
    const { data } = await client.get('/devices', { params });
    return data;
  },

  getDevice: async (id: string): Promise<Device> => {
    const { data } = await client.get(`/devices/${id}`);
    return data;
  },

  createDevice: async (device: { deviceId: string; name: string; locationName?: string }): Promise<Device> => {
    const { data } = await client.post('/devices', device);
    return data;
  },

  updateDevice: async (id: string, updates: Partial<Device>): Promise<Device> => {
    const { data } = await client.patch(`/devices/${id}`, updates);
    return data;
  },

  deleteDevice: async (id: string): Promise<void> => {
    await client.delete(`/devices/${id}`);
  },

  rebootDevice: async (id: string): Promise<void> => {
    await client.post(`/devices/${id}/reboot`);
  },

  requestScreenshot: async (id: string): Promise<{ url: string }> => {
    const { data } = await client.get(`/devices/${id}/screenshot`);
    return data;
  },

  getDeviceMetrics: async (id: string, period: string = '24h'): Promise<DeviceMetric[]> => {
    const { data } = await client.get(`/devices/${id}/metrics`, { params: { period } });
    return data;
  },

  getDeviceLogs: async (id: string, params?: { level?: string; limit?: number }): Promise<DeviceLog[]> => {
    const { data } = await client.get(`/devices/${id}/logs`, { params });
    return data;
  },

  sendCommand: async (id: string, command: string, payload?: Record<string, unknown>): Promise<void> => {
    await client.post(`/devices/${id}/command`, { command, payload });
  },

  bulkReboot: async (deviceIds: string[]): Promise<void> => {
    await client.post('/devices/bulk/reboot', { deviceIds });
  },

  // Groups
  getGroups: async (): Promise<DeviceGroup[]> => {
    const { data } = await client.get('/groups');
    return data;
  },

  // Alerts
  getAlerts: async (params?: { acknowledged?: boolean; severity?: string }): Promise<Alert[]> => {
    const { data } = await client.get('/alerts', { params });
    return data;
  },

  acknowledgeAlert: async (id: string): Promise<void> => {
    await client.post(`/alerts/${id}/acknowledge`);
  },

  bulkAcknowledgeAlerts: async (alertIds: string[]): Promise<void> => {
    await client.post('/alerts/bulk/acknowledge', { alertIds });
  },
};
