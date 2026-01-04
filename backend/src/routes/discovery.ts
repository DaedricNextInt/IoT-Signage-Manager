import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  scanNetwork,
  quickScan,
  scanIp,
  adbConnect,
  getAdbDevices,
  getAdbDeviceInfo,
  adbInstallApk,
  getLocalSubnet,
  DiscoveredDevice,
} from '../services/discovery';

const router = Router();
router.use(authenticate);

// Store for ongoing scans (in production, use Redis)
const ongoingScans: Map<string, {
  status: 'running' | 'completed' | 'error';
  progress: number;
  total: number;
  found: number;
  devices: DiscoveredDevice[];
  error?: string;
}> = new Map();

/**
 * GET /api/discover/subnet
 * Get the local subnet information
 */
router.get('/subnet', async (req: AuthRequest, res, next) => {
  try {
    const subnet = getLocalSubnet();
    res.json({
      subnet: subnet ? `${subnet}.0/24` : null,
      message: subnet ? `Will scan ${subnet}.1 - ${subnet}.254` : 'Could not determine local subnet',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/discover/scan
 * Start a network scan
 */
router.post('/scan', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      mode: z.enum(['quick', 'full']).default('quick'),
    });
    
    const { mode } = schema.parse(req.body);
    
    // Generate scan ID
    const scanId = `scan-${Date.now()}`;
    
    // Initialize scan status
    ongoingScans.set(scanId, {
      status: 'running',
      progress: 0,
      total: 254,
      found: 0,
      devices: [],
    });
    
    // Return scan ID immediately
    res.json({ scanId, message: 'Scan started' });
    
    // Run scan in background
    const scanFn = mode === 'quick' ? quickScan : scanNetwork;
    
    scanFn(
      // Progress callback
      (current, total, found) => {
        const scan = ongoingScans.get(scanId);
        if (scan) {
          scan.progress = current;
          scan.total = total;
          scan.found = found;
        }
      },
      // Device found callback
      (device) => {
        const scan = ongoingScans.get(scanId);
        if (scan) {
          scan.devices.push(device);
          
          // Emit via WebSocket if available
          const io = req.app.get('io');
          io?.emit('discovery:deviceFound', { scanId, device });
        }
      }
    )
      .then((devices) => {
        const scan = ongoingScans.get(scanId);
        if (scan) {
          scan.status = 'completed';
          scan.devices = devices;
          
          // Emit completion via WebSocket
          const io = req.app.get('io');
          io?.emit('discovery:completed', { scanId, devices });
        }
        
        // Clean up after 5 minutes
        setTimeout(() => ongoingScans.delete(scanId), 5 * 60 * 1000);
      })
      .catch((error) => {
        const scan = ongoingScans.get(scanId);
        if (scan) {
          scan.status = 'error';
          scan.error = error.message;
        }
      });
      
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/discover/scan/:id
 * Get scan status and results
 */
router.get('/scan/:id', async (req: AuthRequest, res, next) => {
  try {
    const scan = ongoingScans.get(req.params.id);
    
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    
    res.json({
      status: scan.status,
      progress: Math.round((scan.progress / scan.total) * 100),
      devicesFound: scan.found,
      devices: scan.devices,
      error: scan.error,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/discover/scan-ip
 * Scan a specific IP address
 */
router.post('/scan-ip', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      ip: z.string().ip(),
    });
    
    const { ip } = schema.parse(req.body);
    const device = await scanIp(ip);
    
    if (device) {
      res.json({ found: true, device });
    } else {
      res.json({ found: false, message: 'No compatible device found at this IP' });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/discover/adb/connect
 * Connect to a device via ADB
 */
router.post('/adb/connect', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      ip: z.string().ip(),
    });
    
    const { ip } = schema.parse(req.body);
    const result = await adbConnect(ip);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/discover/adb/devices
 * List connected ADB devices
 */
router.get('/adb/devices', async (req: AuthRequest, res, next) => {
  try {
    const devices = await getAdbDevices();
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/discover/adb/devices/:id/info
 * Get device info via ADB
 */
router.get('/adb/devices/:id/info', async (req: AuthRequest, res, next) => {
  try {
    const info = await getAdbDeviceInfo(req.params.id);
    res.json(info);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/discover/register
 * Register a discovered device
 */
router.post('/register', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      ip: z.string().ip(),
      name: z.string().min(1).max(100),
      deviceType: z.string().optional(),
      locationName: z.string().optional(),
      locationFloor: z.string().optional(),
      locationBuilding: z.string().optional(),
      groupId: z.string().uuid().optional(),
    });
    
    const data = schema.parse(req.body);
    
    // Generate a device ID from IP
    const deviceId = `device-${data.ip.replace(/\./g, '-')}`;
    
    // Check if device already exists
    const existing = await prisma.device.findUnique({
      where: { deviceId },
    });
    
    if (existing) {
      return res.status(409).json({ 
        error: 'Device already registered',
        device: existing,
      });
    }
    
    // Get additional info via ADB if available
    let model: string | undefined;
    let firmwareVersion: string | undefined;
    
    try {
      const adbDevices = await getAdbDevices();
      const adbDevice = adbDevices.find(d => d.id.startsWith(data.ip));
      
      if (adbDevice) {
        const info = await getAdbDeviceInfo(adbDevice.id);
        model = info['ro.product.model'];
        firmwareVersion = info['ro.build.version.release'];
      }
    } catch {
      // ADB info not available
    }
    
    // Create device
    const device = await prisma.device.create({
      data: {
        deviceId,
        name: data.name,
        ipAddress: data.ip,
        model: model || data.deviceType,
        firmwareVersion,
        status: 'PENDING',
        locationName: data.locationName,
        locationFloor: data.locationFloor,
        locationBuilding: data.locationBuilding,
        groupId: data.groupId,
      },
      include: { group: true },
    });
    
    // Emit via WebSocket
    const io = req.app.get('io');
    io?.emit('device:created', device);
    
    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
});

export default router;
