import { Server as SocketIOServer } from 'socket.io';
import prisma from '../utils/prisma';

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

export const startDeviceMonitor = (io: SocketIOServer) => {
  console.log('🔍 Device monitor started');
  setInterval(async () => { try { await checkDeviceStatus(io); } catch (error) { console.error('Device monitor error:', error); } }, CHECK_INTERVAL_MS);
  checkDeviceStatus(io);
};

async function checkDeviceStatus(io: SocketIOServer) {
  const offlineThreshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS);
  const devicesToMarkOffline = await prisma.device.findMany({
    where: { status: 'ONLINE', OR: [{ lastHeartbeat: { lt: offlineThreshold } }, { lastHeartbeat: null, lastSeen: { lt: offlineThreshold } }] },
  });
  for (const device of devicesToMarkOffline) {
    console.log(`📴 Marking device offline: ${device.name} (${device.deviceId})`);
    await prisma.device.update({ where: { id: device.id }, data: { status: 'OFFLINE' } });
    await prisma.alert.create({ data: { deviceId: device.id, alertType: 'DEVICE_OFFLINE', message: `Device "${device.name}" has gone offline`, severity: 'WARNING' } });
    io.emit('device:statusChange', { deviceId: device.id, status: 'OFFLINE', timestamp: new Date().toISOString() });
    io.emit('alert:new', { deviceId: device.id, alertType: 'DEVICE_OFFLINE', severity: 'WARNING' });
  }
}
