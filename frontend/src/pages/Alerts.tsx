import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle, Filter } from 'lucide-react';
import { api } from '@/services/api';
import { formatRelativeTime, cn, getSeverityColor, getSeverityBgColor } from '@/utils';

export const Alerts: React.FC = () => {
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', { acknowledged: showAcknowledged ? undefined : false, severity: severityFilter || undefined }],
    queryFn: () => api.getAlerts({ 
      acknowledged: showAcknowledged ? undefined : false,
      severity: severityFilter || undefined
    }),
    refetchInterval: 30000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.acknowledgeAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const bulkAcknowledgeMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkAcknowledgeAlerts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setSelectedAlerts([]);
    },
  });

  const toggleAlert = (id: string) => {
    setSelectedAlerts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const unacknowledgedCount = alerts.filter(a => !a.isAcknowledged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-500">
            {unacknowledgedCount} unacknowledged alert{unacknowledgedCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Filters:</span>
          </div>
          
          <div className="flex gap-2">
            {['', 'CRITICAL', 'ERROR', 'WARNING', 'INFO'].map((severity) => (
              <button
                key={severity}
                onClick={() => setSeverityFilter(severity)}
                className={cn('btn text-sm', severityFilter === severity ? 'btn-primary' : 'btn-secondary')}
              >
                {severity || 'All'}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-600">Show acknowledged</span>
          </label>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedAlerts.length > 0 && (
        <div className="card p-4 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-700">
              {selectedAlerts.length} alert(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => bulkAcknowledgeMutation.mutate(selectedAlerts)}
                disabled={bulkAcknowledgeMutation.isPending}
                className="btn-primary"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Acknowledge Selected
              </button>
              <button onClick={() => setSelectedAlerts([])} className="btn btn-secondary">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8 text-primary-600" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">All clear!</h3>
          <p className="text-gray-500 mt-1">No alerts match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn('card p-4', alert.isAcknowledged && 'bg-gray-50 opacity-75')}
            >
              <div className="flex items-start gap-4">
                {!alert.isAcknowledged && (
                  <input
                    type="checkbox"
                    checked={selectedAlerts.includes(alert.id)}
                    onChange={() => toggleAlert(alert.id)}
                    className="mt-1 rounded border-gray-300 text-primary-600"
                  />
                )}
                
                <div className={cn('p-2.5 rounded-lg', getSeverityBgColor(alert.severity))}>
                  <AlertTriangle className={cn('w-5 h-5', getSeverityColor(alert.severity))} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'badge',
                      alert.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                      alert.severity === 'ERROR' ? 'badge-danger' :
                      alert.severity === 'WARNING' ? 'badge-warning' : 'bg-blue-100 text-blue-800'
                    )}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-500">{alert.alertType}</span>
                    {alert.isAcknowledged && (
                      <span className="badge badge-success">Acknowledged</span>
                    )}
                  </div>
                  
                  <p className="text-gray-900">{alert.message}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {alert.device && (
                      <Link
                        to={`/devices/${alert.device.id}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {alert.device.name}
                      </Link>
                    )}
                    <span>{formatRelativeTime(alert.createdAt)}</span>
                    {alert.isAcknowledged && alert.acknowledgedAt && (
                      <span>Acknowledged {formatRelativeTime(alert.acknowledgedAt)}</span>
                    )}
                  </div>
                </div>

                {!alert.isAcknowledged && (
                  <button
                    onClick={() => acknowledgeMutation.mutate(alert.id)}
                    disabled={acknowledgeMutation.isPending}
                    className="btn btn-secondary"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
