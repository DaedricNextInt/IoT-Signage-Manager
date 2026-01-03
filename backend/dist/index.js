"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_1 = __importDefault(require("./routes/auth"));
const devices_1 = __importDefault(require("./routes/devices"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const groups_1 = __importDefault(require("./routes/groups"));
const mqtt_1 = require("./services/mqtt");
const websocket_1 = require("./services/websocket");
const deviceMonitor_1 = require("./services/deviceMonitor");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
    },
    path: '/ws',
});
app.set('io', io);
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(requestLogger_1.requestLogger);
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_1.default);
app.use('/api/devices', devices_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/groups', groups_1.default);
app.get('/api/metrics', async (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('# IoT Manager Metrics\n');
});
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 4000;
async function start() {
    try {
        (0, websocket_1.initializeWebSocket)(io);
        console.log('✅ WebSocket initialized');
        try {
            await (0, mqtt_1.initializeMqtt)(io);
            console.log('✅ MQTT connected');
        }
        catch (err) {
            console.log('⚠️  MQTT not available (optional):', err.message);
        }
        (0, deviceMonitor_1.startDeviceMonitor)(io);
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
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map