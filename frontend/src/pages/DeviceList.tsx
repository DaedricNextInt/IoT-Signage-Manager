import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  RotateCcw, 
  Camera,
  Grid,
  List,
  MoreVertical,
  Wifi,
  WifiOff
} from 'lucide-react';
import { api } from '@/services/api';
import { formatRelativeTime, cn, getStatusColor, getStatusBgColor } from '@/utils';
import type { Device } from '@/types';

export const DeviceList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const statusFilter = searchParams.get('status') || '';
  const searchQuery = searchParams.get('search') || '';

  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ['devices', { status: statusFilter, search: searchQuery }],
    queryFn: () => api.getDevices({ 
      status: statusFilter || undefined, 
      search: searchQuery || undefined 
    }),
    refetchInterval: 30000,
  });

  const rebootMutation = useMutation({
    mutationFn: (id: string) => api.rebootDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const bulkRebootMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkReboot(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setSelectedDevices([]);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    setSearchParams(params);
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map(d => d.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-500">{devices.length} devices registered</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search devices..."
                className="input pl-10"
              />
            </div>
          </form>

          {/* Status filters */}
          <div className="flex flex-wrap gap-2">
            {['', 'ONLINE', 'OFFLINE', 'ERROR'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={cn(
                  'btn',
                  statusFilter === status ? 'btn-primary' : 'btn-secondary'
                )}
              >
                {status || 'All'}
              </button>
            ))}
          </div>

          {/* View mode & refresh */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('btn', viewMode === 'grid' ? 'btn-primary' : 'btn-secondary')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('btn', viewMode === 'list' ? 'btn-primary' : 'btn-secondary')}
            >
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => refetch()} className="btn btn-secondary">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedDevices.length > 0 && (
        <div className="card p-4 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-700">
              {selectedDevices.length} device(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => bulkRebootMutation.mutate(selectedDevices)}
                disabled={bulkRebootMutation.isPending}
                className="btn bg-yellow-500 text-white hover:bg-yellow-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reboot Selected
              </button>
              <button onClick={() => setSelectedDevices([])} className="btn btn-secondary">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8 text-primary-600" />
        </div>
      ) : devices.length === 0 ? (
        <div className="card p-12 text-center">
          <WifiOff className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No devices found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your filters or add a new device.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              isSelected={selectedDevices.includes(device.id)}
              onToggle={() => toggleDevice(device.id)}
              onReboot={() => rebootMutation.mutate(device.id)}
            />
          ))}
        </div>
      ) : (
        <DeviceTable
          devices={devices}
          selectedDevices={selectedDevices}
          onToggle={toggleDevice}
          onToggleAll={toggleAll}
          onReboot={(id) => rebootMutation.mutate(id)}
        />
      )}
    </div>
  );
};

interface DeviceCardProps {
  device: Device;
  isSelected: boolean;
  onToggle: () => void;
  onReboot: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, isSelected, onToggle, onReboot }) => {
  const isOnline = device.status === 'ONLINE';

  return (
    <div className={cn(
      'card p-5 transition-all',
      isSelected && 'ring-2 ring-primary-500'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="rounded border-gray-300 text-primary-600"
          />
          <div className={cn('p-2 rounded-lg', getStatusBgColor(device.status))}>
            {isOnline ? (
              <Wifi className={cn('w-5 h-5', getStatusColor(device.status))} />
            ) : (
              <WifiOff className={cn('w-5 h-5', getStatusColor(device.status))} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            'w-2 h-2 rounded-full',
            device.status === 'ONLINE' ? 'status-online' :
            device.status === 'ERROR' ? 'status-error' : 'status-offline'
          )} />
          <span className={cn('text-sm font-medium', getStatusColor(device.status))}>
            {device.status}
          </span>
        </div>
      </div>

      <Link to={`/devices/${device.id}`} className="block mt-4">
        <h3 className="font-semibold text-gray-900 hover:text-primary-600">
          {device.name}
        </h3>
        <p className="text-sm text-gray-500">{device.deviceId}</p>
      </Link>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Location</span>
          <span className="text-gray-900">{device.locationName || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">IP Address</span>
          <span className="text-gray-900 font-mono text-xs">{device.ipAddress || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Last Seen</span>
          <span className="text-gray-900">{formatRelativeTime(device.lastSeen)}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <button
          onClick={onReboot}
          disabled={!isOnline}
          className="btn btn-secondary flex-1 text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reboot
        </button>
        <Link to={`/devices/${device.id}`} className="btn btn-primary flex-1 text-xs">
          View Details
        </Link>
      </div>
    </div>
  );
};

interface DeviceTableProps {
  devices: Device[];
  selectedDevices: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onReboot: (id: string) => void;
}

const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  selectedDevices,
  onToggle,
  onToggleAll,
  onReboot,
}) => {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedDevices.length === devices.length && devices.length > 0}
                  onChange={onToggleAll}
                  className="rounded border-gray-300 text-primary-600"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(device.id)}
                    onChange={() => onToggle(device.id)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link to={`/devices/${device.id}`} className="hover:text-primary-600">
                    <p className="font-medium text-gray-900">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.deviceId}</p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 text-sm font-medium',
                    getStatusColor(device.status)
                  )}>
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      device.status === 'ONLINE' ? 'status-online' :
                      device.status === 'ERROR' ? 'status-error' : 'status-offline'
                    )} />
                    {device.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {device.ipAddress || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {device.locationName || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatRelativeTime(device.lastSeen)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onReboot(device.id)}
                      disabled={device.status !== 'ONLINE'}
                      className="p-1.5 text-gray-400 hover:text-yellow-600 rounded hover:bg-gray-100 disabled:opacity-50"
                      title="Reboot"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                      title="Screenshot"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
