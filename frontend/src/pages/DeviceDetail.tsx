import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  RotateCcw,
  Camera,
  Cpu,
  HardDrive,
  Wifi,
  MapPin,
  Clock,
  Activity,
  Terminal,
  Send
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/services/api';
import { formatRelativeTime, formatDateTime, formatPercent, cn, getStatusColor, getStatusBgColor } from '@/utils';

type Tab = 'overview' | 'metrics' | 'logs' | 'commands';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [metricsPeriod, setMetricsPeriod] = useState('24h');
  const [command, setCommand] = useState('');
  const queryClient = useQueryClient();

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => api.getDevice(id!),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['deviceMetrics', id, metricsPeriod],
    queryFn: () => api.getDeviceMetrics(id!, metricsPeriod),
    enabled: !!id && activeTab === 'metrics',
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['deviceLogs', id],
    queryFn: () => api.getDeviceLogs(id!, { limit: 100 }),
    enabled: !!id && activeTab === 'logs',
  });

  const rebootMutation = useMutation({
    mutationFn: () => api.rebootDevice(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['device', id] }),
  });

  const screenshotMutation = useMutation({
    mutationFn: () => api.requestScreenshot(id!),
  });

  const commandMutation = useMutation({
    mutationFn: (cmd: string) => api.sendCommand(id!, cmd),
    onSuccess: () => setCommand(''),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Device not found</p>
        <Link to="/devices" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          ← Back to devices
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'metrics', label: 'Metrics', icon: <Cpu className="w-4 h-4" /> },
    { id: 'logs', label: 'Logs', icon: <Terminal className="w-4 h-4" /> },
    { id: 'commands', label: 'Commands', icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/devices" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
                getStatusBgColor(device.status),
                getStatusColor(device.status)
              )}>
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  device.status === 'ONLINE' ? 'status-online' :
                  device.status === 'ERROR' ? 'status-error' : 'status-offline'
                )} />
                {device.status}
              </span>
            </div>
            <p className="text-gray-500">{device.deviceId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => screenshotMutation.mutate()}
            disabled={screenshotMutation.isPending || device.status !== 'ONLINE'}
            className="btn btn-secondary"
          >
            <Camera className="w-4 h-4 mr-2" />
            Screenshot
          </button>
          <button
            onClick={() => rebootMutation.mutate()}
            disabled={rebootMutation.isPending || device.status !== 'ONLINE'}
            className="btn bg-yellow-500 text-white hover:bg-yellow-600"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reboot
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-gray-400" />
              Device Info
            </h3>
            <dl className="space-y-4">
              <InfoItem label="Model" value={device.model} />
              <InfoItem label="Serial Number" value={device.serialNumber} mono />
              <InfoItem label="Firmware" value={device.firmwareVersion} />
              <InfoItem label="IP Address" value={device.ipAddress} mono />
              <InfoItem label="MAC Address" value={device.macAddress} mono />
            </dl>
          </div>

          {/* Location */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              Location
            </h3>
            <dl className="space-y-4">
              <InfoItem label="Location" value={device.locationName} />
              <InfoItem label="Building" value={device.locationBuilding} />
              <InfoItem label="Floor" value={device.locationFloor} />
              <InfoItem label="Group" value={device.group?.name} />
            </dl>
          </div>

          {/* Status */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Status
            </h3>
            <dl className="space-y-4">
              <InfoItem label="Last Seen" value={formatRelativeTime(device.lastSeen)} />
              <InfoItem label="Last Heartbeat" value={formatRelativeTime(device.lastHeartbeat)} />
              <InfoItem label="Created" value={formatDateTime(device.createdAt)} />
              <InfoItem label="Updated" value={formatDateTime(device.updatedAt)} />
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex gap-2">
            {['1h', '6h', '24h', '7d'].map((period) => (
              <button
                key={period}
                onClick={() => setMetricsPeriod(period)}
                className={cn('btn', metricsPeriod === period ? 'btn-primary' : 'btn-secondary')}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricChart
              title="CPU Usage"
              icon={<Cpu className="w-5 h-5" />}
              data={metrics}
              dataKey="cpuUsage"
              color="#3b82f6"
            />
            <MetricChart
              title="Memory Usage"
              icon={<HardDrive className="w-5 h-5" />}
              data={metrics}
              dataKey="memoryUsage"
              color="#10b981"
            />
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-sm">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No logs available
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn(
                          'badge',
                          log.level === 'ERROR' || log.level === 'CRITICAL' ? 'badge-danger' :
                          log.level === 'WARNING' ? 'badge-warning' : 'badge-gray'
                        )}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{log.source || '—'}</td>
                      <td className="px-4 py-2 text-gray-900 max-w-md truncate">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'commands' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Command</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (command.trim()) {
                  commandMutation.mutate(command.trim());
                }
              }}
              className="flex gap-4"
            >
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command..."
                className="input flex-1 font-mono"
                disabled={device.status !== 'ONLINE'}
              />
              <button
                type="submit"
                disabled={!command.trim() || commandMutation.isPending || device.status !== 'ONLINE'}
                className="btn-primary"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </button>
            </form>
          </div>

          {/* Quick commands */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Commands</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['reboot', 'screenshot', 'clear-cache', 'update-firmware'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => commandMutation.mutate(cmd)}
                  disabled={device.status !== 'ONLINE'}
                  className="btn btn-secondary"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex justify-between">
    <dt className="text-sm text-gray-500">{label}</dt>
    <dd className={cn('text-sm text-gray-900', mono && 'font-mono')}>{value || '—'}</dd>
  </div>
);

interface MetricChartProps {
  title: string;
  icon: React.ReactNode;
  data: any[];
  dataKey: string;
  color: string;
}

const MetricChart: React.FC<MetricChartProps> = ({ title, icon, data, dataKey, color }) => (
  <div className="card p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {data.length === 0 ? (
      <div className="h-48 flex items-center justify-center text-gray-500">
        No data available
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="recordedAt"
            tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            stroke="#9ca3af"
            fontSize={12}
          />
          <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value: number) => [`${value.toFixed(1)}%`, title]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    )}
  </div>
);
