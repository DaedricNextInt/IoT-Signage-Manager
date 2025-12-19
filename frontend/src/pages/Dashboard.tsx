import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Monitor, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '@/services/api';
import { formatRelativeTime, getStatusColor, getSeverityBgColor, getSeverityColor } from '@/utils';

export const Dashboard: React.FC = () => {
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.getDevices(),
    refetchInterval: 30000,
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', { acknowledged: false }],
    queryFn: () => api.getAlerts({ acknowledged: false }),
    refetchInterval: 30000,
  });

  const stats = {
    total: devices.length,
    online: devices.filter((d) => d.status === 'ONLINE').length,
    offline: devices.filter((d) => d.status === 'OFFLINE').length,
    error: devices.filter((d) => d.status === 'ERROR').length,
    alerts: alerts.length,
  };

  const isLoading = devicesLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your IoT device fleet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Devices"
          value={stats.total}
          icon={<Monitor className="w-5 h-5" />}
          color="primary"
          href="/devices"
        />
        <StatCard
          title="Online"
          value={stats.online}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          href="/devices?status=ONLINE"
        />
        <StatCard
          title="Offline"
          value={stats.offline}
          icon={<XCircle className="w-5 h-5" />}
          color="gray"
          href="/devices?status=OFFLINE"
        />
        <StatCard
          title="Error"
          value={stats.error}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          href="/devices?status=ERROR"
        />
        <StatCard
          title="Active Alerts"
          value={stats.alerts}
          icon={<Activity className="w-5 h-5" />}
          color="yellow"
          href="/alerts"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
            <Link to="/alerts" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y">
            {alerts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>No active alerts</p>
              </div>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg ${getSeverityBgColor(alert.severity)}`}>
                      <AlertTriangle className={`w-4 h-4 ${getSeverityColor(alert.severity)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.device?.name || 'System'} • {formatRelativeTime(alert.createdAt)}
                      </p>
                    </div>
                    <span className={`badge ${getSeverityBgColor(alert.severity)} ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Device List */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Devices</h2>
            <Link to="/devices" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y">
            {devices.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <Monitor className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No devices registered</p>
              </div>
            ) : (
              devices.slice(0, 6).map((device) => (
                <Link
                  key={device.id}
                  to={`/devices/${device.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      device.status === 'ONLINE' ? 'status-online' :
                      device.status === 'ERROR' ? 'status-error' : 'status-offline'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{device.name}</p>
                      <p className="text-xs text-gray-500">{device.locationName || device.deviceId}</p>
                    </div>
                  </div>
                  <span className={`text-sm ${getStatusColor(device.status)}`}>
                    {device.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'red' | 'yellow' | 'gray';
  href: string;
}

const colorMap = {
  primary: 'bg-primary-100 text-primary-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  gray: 'bg-gray-100 text-gray-600',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, href }) => {
  return (
    <Link to={href} className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </Link>
  );
};
