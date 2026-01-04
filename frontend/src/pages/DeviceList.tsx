import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, RefreshCw, RotateCcw, Grid, List, Wifi, WifiOff, Radar } from 'lucide-react';
import { api } from '@/services/api';
import { formatRelativeTime, cn, getStatusColor, getStatusBgColor } from '@/utils';

export const DeviceList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const queryClient = useQueryClient();

  const statusFilter = searchParams.get('status') || '';
  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ['devices', { status: statusFilter, search: searchParams.get('search') }],
    queryFn: () => api.getDevices({ status: statusFilter || undefined, search: searchParams.get('search') || undefined }),
    refetchInterval: 30000,
  });

  const rebootMutation = useMutation({
    mutationFn: (id: string) => api.rebootDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) params.set('search', searchInput); else params.delete('search');
    setSearchParams(params);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status) params.set('status', status); else params.delete('status');
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Devices</h1><p className="text-gray-500">{devices.length} devices registered</p></div>
        <div className="flex gap-2">
          <Link to="/devices/discover" className="btn btn-secondary"><Radar className="w-4 h-4 mr-2" />Discover</Link>
          <button className="btn-primary"><Plus className="w-4 h-4 mr-2" />Add Device</button>
        </div>
      </div>
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search devices..." className="input pl-10" />
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            {['', 'ONLINE', 'OFFLINE', 'ERROR'].map((status) => (
              <button key={status} onClick={() => handleStatusFilter(status)} className={cn('btn', statusFilter === status ? 'btn-primary' : 'btn-secondary')}>{status || 'All'}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('grid')} className={cn('btn', viewMode === 'grid' ? 'btn-primary' : 'btn-secondary')}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={cn('btn', viewMode === 'list' ? 'btn-primary' : 'btn-secondary')}><List className="w-4 h-4" /></button>
            <button onClick={() => refetch()} className="btn btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8 text-primary-600" /></div>
      ) : devices.length === 0 ? (
        <div className="card p-12 text-center"><WifiOff className="w-12 h-12 mx-auto text-gray-400 mb-4" /><h3 className="text-lg font-medium text-gray-900">No devices found</h3></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div key={device.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${getStatusBgColor(device.status)}`}>
                  {device.status === 'ONLINE' ? <Wifi className={cn('w-5 h-5', getStatusColor(device.status))} /> : <WifiOff className={cn('w-5 h-5', getStatusColor(device.status))} />}
                </div>
                <span className={cn('text-sm font-medium', getStatusColor(device.status))}>{device.status}</span>
              </div>
              <Link to={`/devices/${device.id}`} className="block mt-4">
                <h3 className="font-semibold text-gray-900 hover:text-primary-600">{device.name}</h3>
                <p className="text-sm text-gray-500">{device.deviceId}</p>
              </Link>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="text-gray-900">{device.locationName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">IP Address</span><span className="text-gray-900 font-mono text-xs">{device.ipAddress || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Last Seen</span><span className="text-gray-900">{formatRelativeTime(device.lastSeen)}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t flex gap-2">
                <button onClick={() => rebootMutation.mutate(device.id)} disabled={device.status !== 'ONLINE'} className="btn btn-secondary flex-1 text-xs"><RotateCcw className="w-3 h-3 mr-1" />Reboot</button>
                <Link to={`/devices/${device.id}`} className="btn btn-primary flex-1 text-xs">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
