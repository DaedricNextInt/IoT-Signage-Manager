import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import deviceRoutes from './routes/devices';
import alertRoutes from './routes/alerts';
import groupRoutes from './routes/groups';

import { initializeMqtt } from './services/mqtt';
import { initializeWebSocket } from './services/websocket';
import { startDeviceMonitor } from './services/deviceMonitor';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
  path: '/ws',
});

app.set('io', io);

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/groups', groupRoutes);

app.get('/api/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# IoT Manager Metrics\n');
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    initializeWebSocket(io);
    console.log('✅ WebSocket initialized');

    try {
      await initializeMqtt(io);
      console.log('✅ MQTT connected');
    } catch (err) {
      console.log('⚠️  MQTT not available (optional):', (err as Error).message);
    }

    startDeviceMonitor(io);
    console.log('✅ Device monitor started');

    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║         IoT Device Manager Backend Started                ║
╠═══════════════════════════════════════════════════════════╣
║  API Server:    http://localhost:\${PORT}                     ║
║  Health Check:  http://localhost:\${PORT}/health              ║
║  WebSocket:     ws://localhost:\${PORT}/ws                    ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
