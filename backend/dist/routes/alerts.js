"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const { acknowledged, severity, deviceId } = req.query;
        const where = {};
        if (acknowledged !== undefined)
            where.isAcknowledged = acknowledged === 'true';
        if (severity && typeof severity === 'string')
            where.severity = severity;
        if (deviceId && typeof deviceId === 'string')
            where.deviceId = deviceId;
        const alerts = await prisma_1.default.alert.findMany({
            where,
            include: { device: { select: { id: true, deviceId: true, name: true } }, acknowledgedBy: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(alerts);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const alert = await prisma_1.default.alert.findUnique({
            where: { id: req.params.id },
            include: { device: true, acknowledgedBy: { select: { id: true, name: true, email: true } } },
        });
        if (!alert)
            return res.status(404).json({ error: 'Alert not found' });
        res.json(alert);
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/acknowledge', async (req, res, next) => {
    try {
        const alert = await prisma_1.default.alert.update({
            where: { id: req.params.id },
            data: { isAcknowledged: true, acknowledgedById: req.user.id, acknowledgedAt: new Date() },
            include: { device: { select: { id: true, deviceId: true, name: true } } },
        });
        const io = req.app.get('io');
        io?.emit('alert:acknowledged', alert);
        res.json(alert);
    }
    catch (error) {
        next(error);
    }
});
router.post('/bulk/acknowledge', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({ alertIds: zod_1.z.array(zod_1.z.string().uuid()) });
        const { alertIds } = schema.parse(req.body);
        await prisma_1.default.alert.updateMany({ where: { id: { in: alertIds } }, data: { isAcknowledged: true, acknowledgedById: req.user.id, acknowledgedAt: new Date() } });
        const io = req.app.get('io');
        io?.emit('alerts:bulkAcknowledged', { alertIds });
        res.json({ message: 'Alerts acknowledged', count: alertIds.length });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma_1.default.alert.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=alerts.js.map