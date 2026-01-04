import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCcw, Camera, Cpu, MapPin, Clock, Activity, Terminal, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/services/api';
import { formatRelativeTime, formatDateTime, cn, getStatusColor, getStatusBgColor } from '@/utils';

type Tab = 'overview' | 'metrics' | 'logs' | 'commands';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [metricsPeriod, setMetricsPeriod] = useState('24h');
  const [command, setCommand] = useState('');
  const queryClient = useQueryClient();

  const { data: device, isLoading } = useQuery({ queryKey: ['device', id], queryFn: () => api.getDevice(id!), enabled: !!id, refetchInterval: 30000 });
  const { data: metrics = [] } = useQuery({ queryKey: ['deviceMetrics', id, metricsPeriod], queryFn: () => api.getDeviceMetrics(id!, metricsPeriod), enabled: !!id && activeTab === 'metrics' });
  const { data: logs = [] } = useQuery({ queryKey: ['deviceLogs', id], queryFn: () => api.getDeviceLogs(id!, { limit: 100 }), enabled: !!id && activeTab === 'logs' });

  const rebootMutation = useMutation({ mutationFn: () => api.rebootDevice(id!), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['device', id] }) });
  const commandMutation = useMutation({ mutationFn: (cmd: string) => api.sendCommand(id!, cmd), onSuccess: () => setCommand('') });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8 text-primary-600" /></div>;
  if (!device) return <div className="text-center py-12"><p className="text-gray-500">Device not found</p><Link to="/devices" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">← Back to devices</Link></div>;

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'metrics' as Tab, label: 'Metrics', icon: <Cpu className="w-4 h-4" /> },
    { id: 'logs' as Tab, label: 'Logs', icon: <Terminal className="w-4 h-4" /> },
    { id: 'commands' as Tab, label: 'Commands', icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/devices" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium', getStatusBgColor(device.status), getStatusColor(device.status))}>{device.status}</span>
            </div>
            <p className="text-gray-500">{device.deviceId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => rebootMutation.mutate()} disabled={rebootMutation.isPending || device.status !== 'ONLINE'} className="btn bg-yellow-500 text-white hover:bg-yellow-600"><RotateCcw className="w-4 h-4 mr-2" />Reboot</button>
        </div>
      </div>
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors', activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      </div>
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Info</h3>
            <dl className="space-y-4">
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Model</dt><dd className="text-sm text-gray-900">{device.model || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">IP Address</dt><dd className="text-sm text-gray-900 font-mono">{device.ipAddress || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Firmware</dt><dd className="text-sm text-gray-900">{device.firmwareVersion || '—'}</dd></div>
            </dl>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            <dl className="space-y-4">
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Location</dt><dd className="text-sm text-gray-900">{device.locationName || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Building</dt><dd className="text-sm text-gray-900">{device.locationBuilding || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Floor</dt><dd className="text-sm text-gray-900">{device.locationFloor || '—'}</dd></div>
            </dl>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            <dl className="space-y-4">
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Last Seen</dt><dd className="text-sm text-gray-900">{formatRelativeTime(device.lastSeen)}</dd></div>
              <div className="flex justify-between"><dt className="text-sm text-gray-500">Created</dt><dd className="text-sm text-gray-900">{formatDateTime(device.createdAt)}</dd></div>
            </dl>
          </div>
        </div>
      )}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="flex gap-2">{['1h', '6h', '24h', '7d'].map((period) => (<button key={period} onClick={() => setMetricsPeriod(period)} className={cn('btn', metricsPeriod === period ? 'btn-primary' : 'btn-secondary')}>{period}</button>))}</div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Usage</h3>
            {metrics.length === 0 ? <div className="h-48 flex items-center justify-center text-gray-500">No data available</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="recordedAt" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="cpuUsage" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <table className="w-full"><thead className="bg-gray-50 border-b"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Level</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Message</th></tr></thead>
            <tbody className="divide-y font-mono text-sm">{logs.map((log) => (<tr key={log.id}><td className="px-4 py-2 text-gray-500">{formatDateTime(log.createdAt)}</td><td className="px-4 py-2"><span className={cn('badge', log.level === 'ERROR' ? 'badge-danger' : 'badge-gray')}>{log.level}</span></td><td className="px-4 py-2 text-gray-900">{log.message}</td></tr>))}</tbody>
          </table>
        </div>
      )}
      {activeTab === 'commands' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Command</h3>
          <form onSubmit={(e) => { e.preventDefault(); if (command.trim()) commandMutation.mutate(command.trim()); }} className="flex gap-4">
            <input type="text" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Enter command..." className="input flex-1 font-mono" disabled={device.status !== 'ONLINE'} />
            <button type="submit" disabled={!command.trim() || commandMutation.isPending || device.status !== 'ONLINE'} className="btn-primary"><Send className="w-4 h-4 mr-2" />Send</button>
          </form>
        </div>
      )}
    </div>
  );
};
