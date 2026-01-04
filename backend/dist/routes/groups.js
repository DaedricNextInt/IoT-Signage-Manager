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
        const groups = await prisma_1.default.deviceGroup.findMany({
            include: { _count: { select: { devices: true, children: true } }, parent: { select: { id: true, name: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(groups);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const group = await prisma_1.default.deviceGroup.findUnique({
            where: { id: req.params.id },
            include: { devices: true, children: true, parent: true, _count: { select: { devices: true, children: true } } },
        });
        if (!group)
            return res.status(404).json({ error: 'Group not found' });
        res.json(group);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({ name: zod_1.z.string().min(1).max(100), description: zod_1.z.string().optional(), parentId: zod_1.z.string().uuid().optional() });
        const data = schema.parse(req.body);
        const group = await prisma_1.default.deviceGroup.create({ data, include: { _count: { select: { devices: true } } } });
        res.status(201).json(group);
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id', async (req, res, next) => {
    try {
        const schema = zod_1.z.object({ name: zod_1.z.string().min(1).max(100).optional(), description: zod_1.z.string().optional(), parentId: zod_1.z.string().uuid().nullable().optional() });
        const data = schema.parse(req.body);
        const group = await prisma_1.default.deviceGroup.update({ where: { id: req.params.id }, data, include: { _count: { select: { devices: true } } } });
        res.json(group);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma_1.default.device.updateMany({ where: { groupId: req.params.id }, data: { groupId: null } });
        await prisma_1.default.deviceGroup.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=groups.js.map