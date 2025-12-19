import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';

export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return 'Never';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '—';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, 'MMM d, yyyy h:mm a');
  } catch {
    return 'Invalid date';
  }
}

export function formatBytes(bytes: number | undefined | null, decimals: number = 2): string {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatPercent(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ONLINE: 'text-green-600',
    OFFLINE: 'text-gray-500',
    ERROR: 'text-red-600',
    PENDING: 'text-yellow-600',
    REBOOTING: 'text-blue-600',
  };
  return colors[status] || 'text-gray-500';
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    ONLINE: 'bg-green-100',
    OFFLINE: 'bg-gray-100',
    ERROR: 'bg-red-100',
    PENDING: 'bg-yellow-100',
    REBOOTING: 'bg-blue-100',
  };
  return colors[status] || 'bg-gray-100';
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    INFO: 'text-blue-600',
    WARNING: 'text-yellow-600',
    ERROR: 'text-red-500',
    CRITICAL: 'text-red-700',
  };
  return colors[severity] || 'text-gray-500';
}

export function getSeverityBgColor(severity: string): string {
  const colors: Record<string, string> = {
    INFO: 'bg-blue-100',
    WARNING: 'bg-yellow-100',
    ERROR: 'bg-red-100',
    CRITICAL: 'bg-red-200',
  };
  return colors[severity] || 'bg-gray-100';
}
