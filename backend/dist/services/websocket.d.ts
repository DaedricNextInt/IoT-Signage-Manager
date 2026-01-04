import { Server as SocketIOServer } from 'socket.io';
export declare const initializeWebSocket: (io: SocketIOServer) => void;
export declare const emitToDevice: (io: SocketIOServer, deviceId: string, event: string, data: any) => void;
export declare const emitToAll: (io: SocketIOServer, event: string, data: any) => void;
export declare const emitToUser: (io: SocketIOServer, userId: string, event: string, data: any) => void;
//# sourceMappingURL=websocket.d.ts.map