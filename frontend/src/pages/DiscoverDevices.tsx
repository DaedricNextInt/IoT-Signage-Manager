import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Wifi, 
  WifiOff, 
  Search, 
  RefreshCw, 
  Plus, 
  Monitor, 
  Smartphone,
  Tv,
  Cast,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { api } from '@/services/api';
import { cn } from '@/utils';

interface DiscoveredDevice {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  deviceType: 'fire_tv' | 'android' | 'roku' | 'chromecast' | 'unknown';
  adbEnabled: boolean;
  openPorts: number[];
  lastSeen: string;
}

interface ScanStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  devicesFound: number;
  devices: DiscoveredDevice[];
  error?: string;
}

const deviceTypeIcons: Record<string, React.ReactNode> = {
  fire_tv: <Tv className="w-5 h-5 text-orange-500" />,
  android: <Smartphone className="w-5 h-5 text-green-500" />,
  roku: <Monitor className="w-5 h-5 text-purple-500" />,
  chromecast: <Cast className="w-5 h-5 text-blue-500" />,
  unknown: <Monitor className="w-5 h-5 text-gray-500" />,
};

const deviceTypeNames: Record<string, string> = {
  fire_tv: 'Fire TV',
  android: 'Android',
  roku: 'Roku',
  chromecast: 'Chromecast',
  unknown: 'Unknown',
};

export const DiscoverDevices: React.FC = () => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    status: 'idle',
    progress: 0,
    devicesFound: 0,
    devices: [],
  });
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    locationName: '',
    locationBuilding: '',
    locationFloor: '',
  });
  const [scanMode, setScanMode] = useState<'quick' | 'full'>('quick');
  const [scanId, setScanId] = useState<string | null>(null);

  // Start scan mutation
  const startScanMutation = useMutation({
    mutationFn: async (mode: 'quick' | 'full') => {
      const response = await fetch('/api/discover/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token : ''}`,
        },
        body: JSON.stringify({ mode }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      setScanId(data.scanId);
      setScanStatus({
        status: 'running',
        progress: 0,
        devicesFound: 0,
        devices: [],
      });
    },
  });

  // Poll for scan status
  useEffect(() => {
    if (!scanId || scanStatus.status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/discover/scan/${scanId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token : ''}`,
          },
        });
        const data = await response.json();
        
        setScanStatus({
          status: data.status,
          progress: data.progress,
          devicesFound: data.devicesFound,
          devices: data.devices || [],
          error: data.error,
        });

        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling scan status:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scanId, scanStatus.status]);

  // Register device mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { ip: string; name: string; deviceType?: string; locationName?: string; locationFloor?: string; locationBuilding?: string }) => {
      const response = await fetch('/api/discover/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token : ''}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      return response.json();
    },
    onSuccess: () => {
      setSelectedDevice(null);
      setRegisterForm({ name: '', locationName: '', locationBuilding: '', locationFloor: '' });
    },
  });

  const handleStartScan = () => {
    startScanMutation.mutate(scanMode);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;

    registerMutation.mutate({
      ip: selectedDevice.ip,
      name: registerForm.name,
      deviceType: selectedDevice.deviceType,
      locationName: registerForm.locationName || undefined,
      locationFloor: registerForm.locationFloor || undefined,
      locationBuilding: registerForm.locationBuilding || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/devices" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover Devices</h1>
            <p className="text-gray-500">Scan your network for compatible devices</p>
          </div>
        </div>
      </div>

      {/* Scan Controls */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setScanMode('quick')}
              className={cn(
                'btn',
                scanMode === 'quick' ? 'btn-primary' : 'btn-secondary'
              )}
            >
              Quick Scan
            </button>
            <button
              onClick={() => setScanMode('full')}
              className={cn(
                'btn',
                scanMode === 'full' ? 'btn-primary' : 'btn-secondary'
              )}
            >
              Full Scan
            </button>
          </div>
          
          <button
            onClick={handleStartScan}
            disabled={scanStatus.status === 'running'}
            className="btn-primary"
          >
            {scanStatus.status === 'running' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Start Scan
              </>
            )}
          </button>

          <div className="text-sm text-gray-500 ml-auto">
            {scanMode === 'quick' 
              ? 'Quick scan checks ADB port only (~30 seconds)' 
              : 'Full scan checks all ports (~2-3 minutes)'
            }
          </div>
        </div>

        {/* Progress */}
        {scanStatus.status === 'running' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Scanning network...</span>
              <span>{scanStatus.progress}% ({scanStatus.devicesFound} found)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${scanStatus.progress}%` }}
              />
            </div>
          </div>
        )}

        {scanStatus.status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {scanStatus.error || 'Scan failed'}
          </div>
        )}
      </div>

      {/* Results */}
      {scanStatus.devices.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Discovered Devices ({scanStatus.devices.length})
            </h2>
          </div>
          
          <div className="divide-y">
            {scanStatus.devices.map((device) => (
              <div
                key={device.ip}
                className={cn(
                  'p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors',
                  selectedDevice?.ip === device.ip && 'bg-primary-50'
                )}
                onClick={() => setSelectedDevice(device)}
              >
                <div className={cn(
                  'p-3 rounded-lg',
                  device.adbEnabled ? 'bg-green-100' : 'bg-gray-100'
                )}>
                  {deviceTypeIcons[device.deviceType]}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{device.ip}</span>
                    <span className="badge badge-gray">
                      {deviceTypeNames[device.deviceType]}
                    </span>
                    {device.adbEnabled && (
                      <span className="badge badge-success">ADB Ready</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {device.vendor && <span>{device.vendor} • </span>}
                    {device.mac && <span className="font-mono text-xs">{device.mac}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {device.adbEnabled ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No devices found */}
      {scanStatus.status === 'completed' && scanStatus.devices.length === 0 && (
        <div className="card p-12 text-center">
          <WifiOff className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No devices found</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Make sure your devices are powered on, connected to the same network, 
            and have ADB debugging enabled (Settings → Developer Options → ADB Debugging).
          </p>
        </div>
      )}

      {/* Registration Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Register Device</h2>
              <button
                onClick={() => setSelectedDevice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {deviceTypeIcons[selectedDevice.deviceType]}
                <div>
                  <div className="font-medium">{selectedDevice.ip}</div>
                  <div className="text-sm text-gray-500">
                    {selectedDevice.vendor || deviceTypeNames[selectedDevice.deviceType]}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Lobby Display"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={registerForm.locationName}
                  onChange={(e) => setRegisterForm({ ...registerForm, locationName: e.target.value })}
                  className="input"
                  placeholder="e.g., Main Lobby"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Building
                  </label>
                  <input
                    type="text"
                    value={registerForm.locationBuilding}
                    onChange={(e) => setRegisterForm({ ...registerForm, locationBuilding: e.target.value })}
                    className="input"
                    placeholder="e.g., Building A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={registerForm.locationFloor}
                    onChange={(e) => setRegisterForm({ ...registerForm, locationFloor: e.target.value })}
                    className="input"
                    placeholder="e.g., 1st Floor"
                  />
                </div>
              </div>

              {registerMutation.isError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {(registerMutation.error as Error).message}
                </div>
              )}

              {registerMutation.isSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  Device registered successfully!
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDevice(null)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending || !registerForm.name}
                  className="btn-primary flex-1"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Register Device
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          How to Enable ADB on Fire TV
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Go to <strong>Settings</strong> on your Fire TV</li>
          <li>Navigate to <strong>My Fire TV</strong> (or Device & Software)</li>
          <li>Select <strong>Developer Options</strong></li>
          <li>Enable <strong>ADB debugging</strong></li>
          <li>Enable <strong>Apps from Unknown Sources</strong> (if installing custom apps)</li>
          <li>Note the IP address shown in <strong>About → Network</strong></li>
        </ol>
        <p className="mt-4 text-sm text-gray-500">
          After enabling ADB, run a scan to discover your device.
        </p>
      </div>
    </div>
  );
};
