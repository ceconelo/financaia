import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { botState } from '../state/botState.js';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: 'http://localhost:3000',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('🔌 Cliente conectado ao WebSocket');

        // Enviar estado atual quando cliente conecta
        socket.emit('connection-status', {
            connected: botState.connected,
            phoneNumber: botState.phoneNumber,
            uptime: botState.connectedAt ? Math.floor((Date.now() - botState.connectedAt.getTime()) / 1000) : 0
        });

        // Se houver QR code pendente, enviar
        if (botState.qrCode && !botState.connected) {
            socket.emit('qr', botState.qrCode);
        }

        socket.on('disconnect', () => {
            console.log('🔌 Cliente desconectado');
        });
    });

    return io;
};

export { io };
