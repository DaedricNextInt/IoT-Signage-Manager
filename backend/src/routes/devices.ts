import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getMqttClient } from '../services/mqtt';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/devices
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { status, search, groupId } = req.query;

    const where: any = {};
    
    if (status && typeof status === 'string') {
      where.status = status;
    }
    
    if (groupId && typeof groupId === 'string') {
      where.groupId = groupId;
    }
    
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { deviceId: { contains: search, mode: 'insensitive' } },
        { locationName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const devices = await prisma.device.findMany({
      where,
      include: {
        group: true,
        _count: {
          select: { alerts: { where: { isAcknowledged: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(devices);
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        group: true,
        _count: {
          select: {
            alerts: true,
            metrics: true,
            logs: true,
            events: true,
            commands: true,
            screenshots: true,
          },
        },
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    next(error);
  }
});

// POST /api/devices
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      deviceId: z.string().min(3).max(50),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      groupId: z.string().uuid().optional(),
      locationName: z.string().optional(),
      locationFloor: z.string().optional(),
      locationBuilding: z.string().optional(),
      tags: z.array(z.string()).optional(),
    });

    const data = schema.parse(req.body);

    const device = await prisma.device.create({
      data: {
        ...data,
        status: 'PENDING',
      },
      include: { group: true },
    });

    // Emit to WebSocket
    const io = req.app.get('io');
    io?.emit('device:created', device);

    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/devices/:id
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      groupId: z.string().uuid().nullable().optional(),
      locationName: z.string().optional(),
      locationFloor: z.string().optional(),
      locationBuilding: z.string().optional(),
      tags: z.array(z.string()).optional(),
      settings: z.record(z.any()).optional(),
    });

    const data = schema.parse(req.body);

    const device = await prisma.device.update({
      where: { id: req.params.id },
      data,
      include: { group: true },
    });

    const io = req.app.get('io');
    io?.emit('device:updated', device);

    res.json(device);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/devices/:id
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.device.delete({
      where: { id: req.params.id },
    });

    const io = req.app.get('io');
    io?.emit('device:deleted', { id: req.params.id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/devices/:id/reboot
router.post('/:id/reboot', async (req: AuthRequest, res, next) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Create command record
    const command = await prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        command: 'reboot',
        status: 'PENDING',
      },
    });

    // Send MQTT command
    const mqtt = getMqttClient();
    if (mqtt) {
      mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({
        id: command.id,
        command: 'reboot',
        timestamp: new Date().toISOString(),
      }));
    }

    // Update device status
    await prisma.device.update({
      where: { id: device.id },
      data: { status: 'REBOOTING' },
    });

    const io = req.app.get('io');
    io?.emit('device:statusChange', { deviceId: device.id, status: 'REBOOTING' });

    res.json({ message: 'Reboot command sent', commandId: command.id });
  } catch (error) {
    next(error);
  }
});

// POST /api/devices/:id/command
router.post('/:id/command', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      command: z.string(),
      payload: z.record(z.any()).optional(),
    });

    const { command: cmd, payload } = schema.parse(req.body);

    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const command = await prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        command: cmd,
        payload: payload || {},
        status: 'PENDING',
      },
    });

    // Send via MQTT
    const mqtt = getMqttClient();
    if (mqtt) {
      mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({
        id: command.id,
        command: cmd,
        payload,
        timestamp: new Date().toISOString(),
      }));
    }

    res.json({ message: 'Command sent', commandId: command.id });
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id/metrics
router.get('/:id/metrics', async (req: AuthRequest, res, next) => {
  try {
    const { period = '24h' } = req.query;
    
    let hours = 24;
    switch (period) {
      case '1h': hours = 1; break;
      case '6h': hours = 6; break;
      case '24h': hours = 24; break;
      case '7d': hours = 168; break;
      case '30d': hours = 720; break;
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await prisma.deviceMetric.findMany({
      where: {
        deviceId: req.params.id,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
    });

    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id/logs
router.get('/:id/logs', async (req: AuthRequest, res, next) => {
  try {
    const { level, limit = '100' } = req.query;

    const where: any = { deviceId: req.params.id };
    if (level && typeof level === 'string') {
      where.level = level;
    }

    const logs = await prisma.deviceLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id/events
router.get('/:id/events', async (req: AuthRequest, res, next) => {
  try {
    const { type, limit = '50' } = req.query;

    const where: any = { deviceId: req.params.id };
    if (type && typeof type === 'string') {
      where.eventType = type;
    }

    const events = await prisma.deviceEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

// GET /api/devices/:id/screenshot
router.get('/:id/screenshot', async (req: AuthRequest, res, next) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Send MQTT command to request screenshot
    const mqtt = getMqttClient();
    if (mqtt) {
      mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({
        command: 'screenshot',
        timestamp: new Date().toISOString(),
      }));
    }

    // Return latest screenshot
    const screenshot = await prisma.screenshot.findFirst({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      message: 'Screenshot requested',
      latestScreenshot: screenshot,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/devices/bulk/reboot
router.post('/bulk/reboot', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      deviceIds: z.array(z.string().uuid()),
    });

    const { deviceIds } = schema.parse(req.body);

    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds } },
    });

    const mqtt = getMqttClient();
    const results = [];

    for (const device of devices) {
      const command = await prisma.deviceCommand.create({
        data: {
          deviceId: device.id,
          command: 'reboot',
          status: 'PENDING',
        },
      });

      if (mqtt) {
        mqtt.publish(`devices/${device.deviceId}/commands`, JSON.stringify({
          id: command.id,
          command: 'reboot',
          timestamp: new Date().toISOString(),
        }));
      }

      results.push({ deviceId: device.id, commandId: command.id });
    }

    // Update statuses
    await prisma.device.updateMany({
      where: { id: { in: deviceIds } },
      data: { status: 'REBOOTING' },
    });

    res.json({ message: 'Bulk reboot initiated', results });
  } catch (error) {
    next(error);
  }
});

export default router;
