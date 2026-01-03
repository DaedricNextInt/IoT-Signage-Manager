import { MqttClient } from 'mqtt';
import { Server as SocketIOServer } from 'socket.io';
export declare const getMqttClient: () => MqttClient | null;
export declare const initializeMqtt: (io: SocketIOServer) => Promise<void>;
export declare const publishToDevice: (deviceId: string, topic: string, payload: any) => void;
//# sourceMappingURL=mqtt.d.ts.map