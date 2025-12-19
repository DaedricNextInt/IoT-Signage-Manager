import React, { useState } from 'react';
import { User, Key, Bell, Database, Save, Server, Wifi } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState({
    deviceOffline: true,
    errors: true,
    email: false,
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update
    console.log('Saving profile:', { name });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // TODO: Implement password change
    console.log('Changing password');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <div className="card">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                Profile
              </h2>
            </div>
            <form onSubmit={handleProfileSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="input bg-gray-50"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div className="pt-2">
                <button type="submit" className="btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Password */}
          <div className="card">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-gray-400" />
                Change Password
              </h2>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="card">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-400" />
                Notifications
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Device offline alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.deviceOffline}
                  onChange={(e) => setNotifications({ ...notifications, deviceOffline: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Error alerts</span>
                <input
                  type="checkbox"
                  checked={notifications.errors}
                  onChange={(e) => setNotifications({ ...notifications, errors: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Email notifications</span>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          {/* System Info */}
          <div className="card">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-400" />
                System Info
              </h2>
            </div>
            <div className="p-6">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Version</dt>
                  <dd className="font-medium text-gray-900">1.0.0</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Your Role</dt>
                  <dd className="font-medium text-gray-900">{user?.role || 'USER'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">API Status</dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-600 font-medium">Connected</span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">MQTT Status</dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-600 font-medium">Connected</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Quick Links */}
          <div className="card">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                Quick Links
              </h2>
            </div>
            <div className="p-4 space-y-2">
              <a
                href="/grafana"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Grafana</p>
                  <p className="text-xs text-gray-500">Monitoring dashboards</p>
                </div>
              </a>
              <a
                href="/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">API Health</p>
                  <p className="text-xs text-gray-500">Check API status</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
