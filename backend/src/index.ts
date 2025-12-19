import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import deviceRoutes from './routes/devices';
import alertRoutes from './routes/alerts';
import groupRoutes from './routes/groups';

// Import services
import { initializeMqtt } from './services/mqtt';
import { initializeWebSocket } from './services/websocket';
import { startDeviceMonitor } from './services/deviceMonitor';

// Import middleware
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

// Store io instance for use in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/groups', groupRoutes);

// Metrics endpoint (for Prometheus)
app.get('/api/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# IoT Manager Metrics\n# TODO: Add prometheus metrics');
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Initialize WebSocket
    initializeWebSocket(io);
    console.log('✅ WebSocket initialized');

    // Initialize MQTT (optional - won't crash if broker not available)
    try {
      await initializeMqtt(io);
      console.log('✅ MQTT connected');
    } catch (err) {
      console.log('⚠️  MQTT not available (optional):', (err as Error).message);
    }

    // Start device status monitor
    startDeviceMonitor(io);
    console.log('✅ Device monitor started');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║         IoT Device Manager Backend Started                ║
╠═══════════════════════════════════════════════════════════╣
║  API Server:    http://localhost:${PORT}                     ║
║  Health Check:  http://localhost:${PORT}/health              ║
║  WebSocket:     ws://localhost:${PORT}/ws                    ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
