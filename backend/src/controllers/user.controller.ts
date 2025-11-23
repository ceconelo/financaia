import { Request, Response } from 'express';
import { prisma } from '../services/finance.js';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                phoneNumber: true,
                name: true,
                xp: true,
                level: true,
                streak: true,
                lastActivity: true,
                createdAt: true,
                _count: {
                    select: {
                        transactions: true,
                        achievements: true
                    }
                }
            },
            orderBy: {
                lastActivity: 'desc'
            },
            take: 50
        });

        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};
