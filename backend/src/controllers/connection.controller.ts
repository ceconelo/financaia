import { Request, Response } from 'express';
import { botState } from '../state/botState.js';

export const getConnectionStatus = (req: Request, res: Response) => {
    res.json({
        connected: botState.connected,
        phoneNumber: botState.phoneNumber,
        uptime: botState.connectedAt
            ? Math.floor((Date.now() - botState.connectedAt.getTime()) / 1000)
            : 0,
        isReconnecting: botState.isReconnecting
    });
};
