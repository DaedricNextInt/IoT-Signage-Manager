import mqtt, { MqttClient } from 'mqtt';
import { Server as SocketIOServer } from 'socket.io';
import prisma from '../utils/prisma';

let mqttClient: MqttClient | null = null;

export const getMqttClient = (): MqttClient | null => mqttClient;

export const initializeMqtt = (io: SocketIOServer): Promise<void> => {
  return new Promise((resolve, reject) => {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const options: mqtt.IClientOptions = { clientId: `iot-backend-${Date.now()}`, clean: true, reconnectPeriod: 5000 };
    if (process.env.MQTT_USERNAME) { options.username = process.env.MQTT_USERNAME; options.password = process.env.MQTT_PASSWORD; }
    mqttClient = mqtt.connect(brokerUrl, options);

    mqttClient.on('connect', () => {
      console.log('📡 MQTT connected to', brokerUrl);
      mqttClient!.subscribe('devices/+/status', { qos: 1 });
      mqttClient!.subscribe('devices/+/metrics', { qos: 0 });
      mqttClient!.subscribe('devices/+/logs', { qos: 0 });
      mqttClient!.subscribe('devices/+/events', { qos: 1 });
      mqttClient!.subscribe('devices/+/response', { qos: 1 });
      resolve();
    });

    mqttClient.on('error', (error) => { console.error('MQTT error:', error); reject(error); });

    mqttClient.on('message', async (topic, message) => {
      try {
        const parts = topic.split('/');
        const deviceId = parts[1];
        const messageType = parts[2];
        const payload = JSON.parse(message.toString());
        switch (messageType) {
          case 'status': await handleDeviceStatus(deviceId, payload, io); break;
          case 'metrics': await handleDeviceMetrics(deviceId, payload, io); break;
          case 'logs': await handleDeviceLog(deviceId, payload); break;
          case 'events': await handleDeviceEvent(deviceId, payload, io); break;
          case 'response': await handleCommandResponse(deviceId, payload); break;
        }
      } catch (error) { console.error('Error processing MQTT message:', error); }
    });

    setTimeout(() => { if (!mqttClient?.connected) reject(new Error('MQTT connection timeout')); }, 10000);
  });
};

async function handleDeviceStatus(deviceId: string, payload: any, io: SocketIOServer) {
  const device = await prisma.device.findUnique({ where: { deviceId } });
  if (!device) { console.log(`Unknown device: ${deviceId}`); return; }
  const updateData: any = { status: payload.status, lastSeen: new Date(), lastHeartbeat: new Date() };
  if (payload.ipAddress) updateData.ipAddress = payload.ipAddress;
  if (payload.firmwareVersion) updateData.firmwareVersion = payload.firmwareVersion;
  await prisma.device.update({ where: { id: device.id }, data: updateData });
  io.emit('device:statusChange', { deviceId: device.id, status: payload.status, timestamp: new Date().toISOString() });
}

async function handleDeviceMetrics(deviceId: string, payload: any, io: SocketIOServer) {
  const device = await prisma.device.findUnique({ where: { deviceId } });
  if (!device) return;
  await prisma.deviceMetric.create({
    data: { deviceId: device.id, cpuUsage: payload.cpuUsage, memoryUsage: payload.memoryUsage, storageUsage: payload.storageUsage, cpuTemperature: payload.cpuTemperature },
  });
  io.emit('device:metrics', { deviceId: device.id, metrics: payload, timestamp: new Date().toISOString() });
}

async function handleDeviceLog(deviceId: string, payload: any) {
  const device = await prisma.device.findUnique({ where: { deviceId } });
  if (!device) return;
  await prisma.deviceLog.create({ data: { deviceId: device.id, level: payload.level || 'INFO', message: payload.message, source: payload.source } });
}

async function handleDeviceEvent(deviceId: string, payload: any, io: SocketIOServer) {
  const device = await prisma.device.findUnique({ where: { deviceId } });
  if (!device) return;
  await prisma.deviceEvent.create({ data: { deviceId: device.id, eventType: payload.eventType, eventData: payload.eventData || {}, severity: payload.severity || 'INFO' } });
  if (payload.severity === 'ERROR' || payload.severity === 'CRITICAL') {
    await prisma.alert.create({ data: { deviceId: device.id, alertType: payload.eventType, message: payload.message || `${payload.eventType} event`, severity: payload.severity } });
    io.emit('alert:new', { deviceId: device.id, eventType: payload.eventType, severity: payload.severity });
  }
}

async function handleCommandResponse(deviceId: string, payload: any) {
  if (!payload.commandId) return;
  await prisma.deviceCommand.update({ where: { id: payload.commandId }, data: { status: payload.success ? 'COMPLETED' : 'FAILED', completedAt: new Date(), response: payload.response || {}, errorMessage: payload.error } });
}

export const publishToDevice = (deviceId: string, topic: string, payload: any) => {
  if (mqttClient?.connected) mqttClient.publish(`devices/${deviceId}/${topic}`, JSON.stringify(payload));
};
