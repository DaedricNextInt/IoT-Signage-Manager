import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/alerts
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { acknowledged, severity, deviceId } = req.query;

    const where: any = {};

    if (acknowledged !== undefined) {
      where.isAcknowledged = acknowledged === 'true';
    }

    if (severity && typeof severity === 'string') {
      where.severity = severity;
    }

    if (deviceId && typeof deviceId === 'string') {
      where.deviceId = deviceId;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        device: {
          select: { id: true, deviceId: true, name: true },
        },
        acknowledgedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/:id
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: {
        device: true,
        acknowledgedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', async (req: AuthRequest, res, next) => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: {
        isAcknowledged: true,
        acknowledgedById: req.user!.id,
        acknowledgedAt: new Date(),
      },
      include: {
        device: {
          select: { id: true, deviceId: true, name: true },
        },
      },
    });

    const io = req.app.get('io');
    io?.emit('alert:acknowledged', alert);

    res.json(alert);
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/bulk/acknowledge
router.post('/bulk/acknowledge', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      alertIds: z.array(z.string().uuid()),
    });

    const { alertIds } = schema.parse(req.body);

    await prisma.alert.updateMany({
      where: { id: { in: alertIds } },
      data: {
        isAcknowledged: true,
        acknowledgedById: req.user!.id,
        acknowledgedAt: new Date(),
      },
    });

    const io = req.app.get('io');
    io?.emit('alerts:bulkAcknowledged', { alertIds });

    res.json({ message: 'Alerts acknowledged', count: alertIds.length });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.alert.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
