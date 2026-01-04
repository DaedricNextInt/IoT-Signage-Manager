"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDeviceMonitor = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const startDeviceMonitor = (io) => {
    console.log('🔍 Device monitor started');
    setInterval(async () => { try {
        await checkDeviceStatus(io);
    }
    catch (error) {
        console.error('Device monitor error:', error);
    } }, CHECK_INTERVAL_MS);
    checkDeviceStatus(io);
};
exports.startDeviceMonitor = startDeviceMonitor;
async function checkDeviceStatus(io) {
    const offlineThreshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS);
    const devicesToMarkOffline = await prisma_1.default.device.findMany({
        where: { status: 'ONLINE', OR: [{ lastHeartbeat: { lt: offlineThreshold } }, { lastHeartbeat: null, lastSeen: { lt: offlineThreshold } }] },
    });
    for (const device of devicesToMarkOffline) {
        console.log(`📴 Marking device offline: ${device.name} (${device.deviceId})`);
        await prisma_1.default.device.update({ where: { id: device.id }, data: { status: 'OFFLINE' } });
        await prisma_1.default.alert.create({ data: { deviceId: device.id, alertType: 'DEVICE_OFFLINE', message: `Device "${device.name}" has gone offline`, severity: 'WARNING' } });
        io.emit('device:statusChange', { deviceId: device.id, status: 'OFFLINE', timestamp: new Date().toISOString() });
        io.emit('alert:new', { deviceId: device.id, alertType: 'DEVICE_OFFLINE', severity: 'WARNING' });
    }
}
//# sourceMappingURL=deviceMonitor.js.map