import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const initializeWebSocket = (io: SocketIOServer) => {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      // Allow unauthenticated connections for now (can restrict later)
      return next();
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-change-me';
      const decoded = jwt.verify(token, secret) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    // Join user-specific room if authenticated
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Subscribe to device updates
    socket.on('subscribe:device', (deviceId: string) => {
      socket.join(`device:${deviceId}`);
      console.log(`Socket ${socket.id} subscribed to device ${deviceId}`);
    });

    socket.on('unsubscribe:device', (deviceId: string) => {
      socket.leave(`device:${deviceId}`);
      console.log(`Socket ${socket.id} unsubscribed from device ${deviceId}`);
    });

    // Subscribe to alerts
    socket.on('subscribe:alerts', () => {
      socket.join('alerts');
      console.log(`Socket ${socket.id} subscribed to alerts`);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`WebSocket error for ${socket.id}:`, error);
    });
  });

  console.log('WebSocket server initialized');
};

// Helper functions to emit events
export const emitToDevice = (io: SocketIOServer, deviceId: string, event: string, data: any) => {
  io.to(`device:${deviceId}`).emit(event, data);
};

export const emitToAll = (io: SocketIOServer, event: string, data: any) => {
  io.emit(event, data);
};

export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};
