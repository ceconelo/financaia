import express from 'express';
import { prisma } from '../services/finance.js';

// Middleware de autenticação (Header ou Query Param)
export const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        let token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

        // Fallback para query param (para compatibilidade/magic link)
        if (!token && req.query.token) {
            token = req.query.token as string;
        }

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: Token missing' });
        }

        const user = await prisma.user.findUnique({
            where: { dashboardToken: token },
            include: { familyGroup: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Anexar usuário ao request
        (req as any).user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Internal server error during auth' });
    }
};

// Middleware de Admin
export const authenticateAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // TODO: Implementar lógica real de admin.
    // Por enquanto, vamos verificar se existe um header 'x-admin-secret' ou se o usuário autenticado tem role 'ADMIN'
    // Como não temos autenticação nas rotas de admin ainda, vamos usar um segredo simples via env ou hardcoded para teste.

    const adminSecret = process.env.ADMIN_SECRET || 'admin123'; // Em produção, use uma variável de ambiente forte!
    const requestSecret = req.headers['x-admin-secret'];

    if (requestSecret === adminSecret) {
        return next();
    }

    return res.status(403).json({ error: 'Forbidden: Admin access only' });
};

// Middleware para validar requisições do Bot/Chat
export const validateBotRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Em produção, o bot deve enviar um secret compartilhado
    // Para teste local, permitimos localhost ou um secret específico

    const botSecret = process.env.BOT_SECRET || 'bot_secret_123';
    const requestSecret = req.headers['x-bot-secret'];

    // Permitir se vier do localhost (para testes locais simples)
    const remoteAddress = req.socket.remoteAddress;
    const isLocalhost = remoteAddress === '::1' || remoteAddress === '127.0.0.1' || remoteAddress === '::ffff:127.0.0.1';

    if (requestSecret === botSecret || isLocalhost) {
        return next();
    }

    return res.status(403).json({ error: 'Forbidden: Bot access only' });
};
