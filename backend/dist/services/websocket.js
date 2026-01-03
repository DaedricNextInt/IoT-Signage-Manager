"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.emitToAll = exports.emitToDevice = exports.initializeWebSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const initializeWebSocket = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next();
        try {
            const secret = process.env.JWT_SECRET || 'fallback-secret-change-me';
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            socket.userId = decoded.userId;
            next();
        }
        catch (error) {
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`WebSocket client connected: ${socket.id}`);
        if (socket.userId)
            socket.join(`user:${socket.userId}`);
        socket.on('subscribe:device', (deviceId) => { socket.join(`device:${deviceId}`); });
        socket.on('unsubscribe:device', (deviceId) => { socket.leave(`device:${deviceId}`); });
        socket.on('subscribe:alerts', () => { socket.join('alerts'); });
        socket.on('ping', () => { socket.emit('pong', { timestamp: Date.now() }); });
        socket.on('disconnect', (reason) => { console.log(`WebSocket disconnected: ${socket.id}, reason: ${reason}`); });
    });
    console.log('WebSocket server initialized');
};
exports.initializeWebSocket = initializeWebSocket;
const emitToDevice = (io, deviceId, event, data) => { io.to(`device:${deviceId}`).emit(event, data); };
exports.emitToDevice = emitToDevice;
const emitToAll = (io, event, data) => { io.emit(event, data); };
exports.emitToAll = emitToAll;
const emitToUser = (io, userId, event, data) => { io.to(`user:${userId}`).emit(event, data); };
exports.emitToUser = emitToUser;
//# sourceMappingURL=websocket.js.map