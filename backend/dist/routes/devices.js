"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_1 = require("../middleware/auth");
const mqtt_1 = require("../services/mqtt");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const { status, search, groupId } = req.query;
        const where = {};
        if (status && typeof status === 'string')
            where.status = status;
        if (groupId && typeof groupId === 'string')
            where.groupId = groupId;
        if (search && typeof search === 'string') {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { deviceId: { contains: search, mode: 'insensitive' } },
                { locationName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const devices = await prisma_1.default.device.findMany({
            where,
            include: { group: true, _count: { select: { alerts: { where: { isAcknowledged: false } } } } },
            orderBy: { name: 'asc' },
        });
        res.json(devices);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const device = await prisma_1.default.device.findUnique({
            where: { id: req.params.id },
            include: { group: true, _count: { select: { alerts: true, metrics: true, logs: true, events: true, commands: true, screenshots: true } } },
        });
        if (!device)
            return res.status(404).json({ error: 'Device not found' });
        res.json(device);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            deviceId: zod_1.z.string().min(3).max(50),
            name: zod_1.z.string().min(1).max(100),
            description: zod_1.z.string().optional(),
            groupId: zod_1.z.string().uuid().optional(),
            locationName: zod_1.z.string().optional(),
            locationFloor: zod_1.z.string().optional(),
            locationBuilding: zod_1.z.string().optional(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
        });
        const data = schema.parse(req.body);
        const device = await prisma_1.default.device.create({ data: { ...data, status: 'PENDING' }, include: { group: true } });
        const io = req.app.get('io');
        io?.emit('device:created', device);
        res.status(201).json(device);
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({
            name: zod_1.z.string().min(1).max(100).optional(),
            description: zod_1.z.string().optional(),
            groupId: zod_1.z.string().uuid().nullable().optional(),
            locationName: zod_1.z.string().optional(),
            locationFloor: zod_1.z.string().optional(),
            locationBuilding: zod_1.z.string().optional(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
            settings: zod_1.z.record(zod_1.z.any()).optional(),
        });
        const data = schema.parse(req.body);
        const device = await prisma_1.default.device.update({ where: { id: req.params.id }, data, include: { group: true } });
        const io = req.app.get('io');
        io?.emit('device:updated', device);
        res.json(device);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma_1.default.device.delete({ where: { id: req.params.id } });
        const io = req.app.get('io');
        io?.emit('device:deleted', { id: req.params.id });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/reboot', async (req, res, next) => {
    try {
        const device = await prisma_1.default.device.findUnique({ where: { id: req.params.id } });
        if (!device)
            return res.status(404).json({ error: 'Device not found' });
        const command = await prisma_1.default.deviceCommand.create({ data: { deviceId: device.id, command: 'reboot', status: 'PENDING' } });
        const mqtt = (0, mqtt_1.getMqttClient)();
        if (mqtt)
            mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({ id: command.id, command: 'reboot', timestamp: new Date().toISOString() }));
        await prisma_1.default.device.update({ where: { id: device.id }, data: { status: 'REBOOTING' } });
        const io = req.app.get('io');
        io?.emit('device:statusChange', { deviceId: device.id, status: 'REBOOTING' });
        res.json({ message: 'Reboot command sent', commandId: command.id });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/command', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({ command: zod_1.z.string(), payload: zod_1.z.record(zod_1.z.any()).optional() });
        const { command: cmd, payload } = schema.parse(req.body);
        const device = await prisma_1.default.device.findUnique({ where: { id: req.params.id } });
        if (!device)
            return res.status(404).json({ error: 'Device not found' });
        const command = await prisma_1.default.deviceCommand.create({ data: { deviceId: device.id, command: cmd, payload: payload || {}, status: 'PENDING' } });
        const mqtt = (0, mqtt_1.getMqttClient)();
        if (mqtt)
            mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({ id: command.id, command: cmd, payload, timestamp: new Date().toISOString() }));
        res.json({ message: 'Command sent', commandId: command.id });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/metrics', async (req, res, next) => {
    try {
        const { period = '24h' } = req.query;
        let hours = 24;
        switch (period) {
            case '1h':
                hours = 1;
                break;
            case '6h':
                hours = 6;
                break;
            case '24h':
                hours = 24;
                break;
            case '7d':
                hours = 168;
                break;
            case '30d':
                hours = 720;
                break;
        }
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const metrics = await prisma_1.default.deviceMetric.findMany({ where: { deviceId: req.params.id, recordedAt: { gte: since } }, orderBy: { recordedAt: 'asc' } });
        res.json(metrics);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/logs', async (req, res, next) => {
    try {
        const { level, limit = '100' } = req.query;
        const where = { deviceId: req.params.id };
        if (level && typeof level === 'string')
            where.level = level;
        const logs = await prisma_1.default.deviceLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: parseInt(limit, 10) });
        res.json(logs);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/screenshot', async (req, res, next) => {
    try {
        const device = await prisma_1.default.device.findUnique({ where: { id: req.params.id } });
        if (!device)
            return res.status(404).json({ error: 'Device not found' });
        const mqtt = (0, mqtt_1.getMqttClient)();
        if (mqtt)
            mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({ command: 'screenshot', timestamp: new Date().toISOString() }));
        const screenshot = await prisma_1.default.screenshot.findFirst({ where: { deviceId: device.id }, orderBy: { createdAt: 'desc' } });
        res.json({ message: 'Screenshot requested', latestScreenshot: screenshot });
    }
    catch (error) {
        next(error);
    }
});
router.post('/bulk/reboot', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({ deviceIds: zod_1.z.array(zod_1.z.string().uuid()) });
        const { deviceIds } = schema.parse(req.body);
        const devices = await prisma_1.default.device.findMany({ where: { id: { in: deviceIds } } });
        const mqtt = (0, mqtt_1.getMqttClient)();
        const results = [];
        for (const device of devices) {
            const command = await prisma_1.default.deviceCommand.create({ data: { deviceId: device.id, command: 'reboot', status: 'PENDING' } });
            if (mqtt)
                mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({ id: command.id, command: 'reboot', timestamp: new Date().toISOString() }));
            results.push({ deviceId: device.id, commandId: command.id });
        }
        await prisma_1.default.device.updateMany({ where: { id: { in: deviceIds } }, data: { status: 'REBOOTING' } });
        res.json({ message: 'Bulk reboot initiated', results });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map