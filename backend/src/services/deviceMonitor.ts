import { Server as SocketIOServer } from 'socket.io';
import prisma from '../utils/prisma';

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

export const startDeviceMonitor = (io: SocketIOServer) => {
  console.log('🔍 Device monitor started');

  setInterval(async () => {
    try {
      await checkDeviceStatus(io);
    } catch (error) {
      console.error('Device monitor error:', error);
    }
  }, CHECK_INTERVAL_MS);

  // Run immediately on start
  checkDeviceStatus(io);
};

async function checkDeviceStatus(io: SocketIOServer) {
  const offlineThreshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

  // Find devices that should be marked offline
  const devicesToMarkOffline = await prisma.device.findMany({
    where: {
      status: 'ONLINE',
      OR: [
        { lastHeartbeat: { lt: offlineThreshold } },
        { lastHeartbeat: null, lastSeen: { lt: offlineThreshold } },
      ],
    },
  });

  for (const device of devicesToMarkOffline) {
    console.log(`📴 Marking device offline: ${device.name} (${device.deviceId})`);

    // Update status
    await prisma.device.update({
      where: { id: device.id },
      data: { status: 'OFFLINE' },
    });

    // Create alert
    await prisma.alert.create({
      data: {
        deviceId: device.id,
        alertType: 'DEVICE_OFFLINE',
        message: `Device "${device.name}" has gone offline`,
        severity: 'WARNING',
      },
    });

    // Notify via WebSocket
    io.emit('device:statusChange', {
      deviceId: device.id,
      status: 'OFFLINE',
      timestamp: new Date().toISOString(),
    });

    io.emit('alert:new', {
      deviceId: device.id,
      alertType: 'DEVICE_OFFLINE',
      severity: 'WARNING',
    });
  }

  // Also check for devices that came back online
  // (This would be handled by MQTT status messages in production)
}

// Clean up old metrics data periodically
export const startMetricsCleanup = () => {
  const RETENTION_DAYS = 30;
  const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Daily

  setInterval(async () => {
    try {
      const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      const deleted = await prisma.deviceMetric.deleteMany({
        where: {
          recordedAt: { lt: cutoffDate },
        },
      });

      if (deleted.count > 0) {
        console.log(`🧹 Cleaned up ${deleted.count} old metrics`);
      }
    } catch (error) {
      console.error('Metrics cleanup error:', error);
    }
  }, CLEANUP_INTERVAL_MS);
};
