import { Request, Response } from 'express';
import { prisma } from '../services/finance.js';

export const getWaitlist = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                isAuthorized: false,
                email: { not: null }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar fila de espera' });
    }
};

export const approveUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'UserId obrigatório' });

        await prisma.user.update({
            where: { id: userId },
            data: { isAuthorized: true }
        });

        // Opcional: Notificar usuário via bot (se tivermos acesso ao socket/bot instance aqui)
        // Por enquanto, apenas libera no banco.

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao aprovar usuário' });
    }
};

export const getActiveUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                isAuthorized: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                lastActivity: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários ativos' });
    }
};

export const revokeAccess = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'UserId obrigatório' });

        await prisma.user.update({
            where: { id: userId },
            data: { isAuthorized: false }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao revogar acesso' });
    }
};
