import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/groups
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const groups = await prisma.deviceGroup.findMany({
      include: {
        _count: {
          select: { devices: true, children: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(groups);
  } catch (error) {
    next(error);
  }
});

// GET /api/groups/:id
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const group = await prisma.deviceGroup.findUnique({
      where: { id: req.params.id },
      include: {
        devices: true,
        children: true,
        parent: true,
        _count: {
          select: { devices: true, children: true },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    next(error);
  }
});

// POST /api/groups
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      parentId: z.string().uuid().optional(),
    });

    const data = schema.parse(req.body);

    const group = await prisma.deviceGroup.create({
      data,
      include: {
        _count: { select: { devices: true } },
      },
    });

    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/groups/:id
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      parentId: z.string().uuid().nullable().optional(),
    });

    const data = schema.parse(req.body);

    const group = await prisma.deviceGroup.update({
      where: { id: req.params.id },
      data,
      include: {
        _count: { select: { devices: true } },
      },
    });

    res.json(group);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/groups/:id
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    // Remove group from devices first
    await prisma.device.updateMany({
      where: { groupId: req.params.id },
      data: { groupId: null },
    });

    await prisma.deviceGroup.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
