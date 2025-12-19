// Device types
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'PENDING' | 'REBOOTING';

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  description?: string;
  status: DeviceStatus;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  ipAddress?: string;
  macAddress?: string;
  lastSeen?: string;
  lastHeartbeat?: string;
  locationName?: string;
  locationFloor?: string;
  locationBuilding?: string;
  tags: string[];
  groupId?: string;
  group?: DeviceGroup;
  createdAt: string;
  updatedAt: string;
  _count?: {
    alerts?: number;
  };
}

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  _count?: {
    devices?: number;
  };
}

export interface DeviceMetric {
  id: string;
  deviceId: string;
  cpuUsage?: number;
  memoryUsage?: number;
  storageUsage?: number;
  cpuTemperature?: number;
  recordedAt: string;
}

export interface DeviceLog {
  id: string;
  deviceId: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  source?: string;
  createdAt: string;
}

// Alert types
export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface Alert {
  id: string;
  deviceId?: string;
  device?: Device;
  alertType: string;
  message: string;
  severity: AlertSeverity;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface LoginResponse {
  user: User;
  token: string;
}
