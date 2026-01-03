import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket { userId?: string; }

export const initializeWebSocket = (io: SocketIOServer) => {
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-change-me';
      const decoded = jwt.verify(token, secret) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) { next(new Error('Authentication failed')); }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`WebSocket client connected: ${socket.id}`);
    if (socket.userId) socket.join(`user:${socket.userId}`);
    socket.on('subscribe:device', (deviceId: string) => { socket.join(`device:${deviceId}`); });
    socket.on('unsubscribe:device', (deviceId: string) => { socket.leave(`device:${deviceId}`); });
    socket.on('subscribe:alerts', () => { socket.join('alerts'); });
    socket.on('ping', () => { socket.emit('pong', { timestamp: Date.now() }); });
    socket.on('disconnect', (reason) => { console.log(`WebSocket disconnected: ${socket.id}, reason: ${reason}`); });
  });
  console.log('WebSocket server initialized');
};

export const emitToDevice = (io: SocketIOServer, deviceId: string, event: string, data: any) => { io.to(`device:${deviceId}`).emit(event, data); };
export const emitToAll = (io: SocketIOServer, event: string, data: any) => { io.emit(event, data); };
export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: any) => { io.to(`user:${userId}`).emit(event, data); };
