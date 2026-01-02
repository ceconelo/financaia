import { Request, Response } from 'express';
import { prisma } from '../services/finance.js';
import { getCycleRange } from '../services/date.service.js';

export const getRecentTransactions = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const user = (req as any).user;

        const transactions = await prisma.transaction.findMany({
            where: (user.familyGroup?.adminId === user.id)
                ? { user: { familyGroupId: user.familyGroupId } }
                : { userId: user.id },
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: {
                        phoneNumber: true,
                        name: true
                    }
                }
            }
        });

        res.json(transactions);
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({ error: 'Erro ao buscar transações' });
    }
};

export const getChartData = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user.id;
        const days = parseInt(req.query.days as string) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const whereClause: any = {
            createdAt: { gte: startDate }
        };

        if (user.familyGroup?.adminId === user.id) {
            whereClause.user = { familyGroupId: user.familyGroupId };
        } else {
            whereClause.userId = userId;
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            select: {
                type: true,
                amount: true,
                category: true,
                createdAt: true
            }
        });

        // Agrupar por dia
        const dailyData: Record<string, { date: string; income: number; expense: number }> = {};

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyData[dateStr] = { date: dateStr, income: 0, expense: 0 };
        }

        transactions.forEach(t => {
            const dateStr = t.createdAt.toISOString().split('T')[0];
            if (dailyData[dateStr]) {
                if (t.type === 'INCOME') {
                    dailyData[dateStr].income += t.amount;
                } else {
                    dailyData[dateStr].expense += t.amount;
                }
            }
        });

        const chartData = Object.values(dailyData).reverse();

        res.json(chartData);
    } catch (error) {
        console.error('Erro ao buscar dados do gráfico:', error);
        res.status(500).json({ error: 'Erro ao buscar dados' });
    }
};

export const resetTransactions = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const month = parseInt(req.query.month as string);
        const year = parseInt(req.query.year as string);

        if (!month || !year) {
            return res.status(400).json({ error: 'Month e year são obrigatórios' });
        }

        // Calculate start and end dates using the centralized cycle logic
        const { startDate, endDate } = getCycleRange(month, year);

        let whereClause: any = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };

        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { familyGroup: true }
        });

        if (fullUser?.familyGroupId && fullUser.familyGroup?.adminId === fullUser.id) {
            const familyMembers = await prisma.user.findMany({
                where: { familyGroupId: fullUser.familyGroupId },
                select: { id: true }
            });
            const memberIds = familyMembers.map(m => m.id);
            whereClause.userId = { in: memberIds };
        } else {
            whereClause.userId = user.id;
        }

        const result = await prisma.transaction.deleteMany({
            where: whereClause
        });

        res.json({ success: true, count: result.count });
    } catch (error) {
        console.error('Erro ao resetar dados:', error);
        res.status(500).json({ error: 'Erro ao resetar dados' });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const month = parseInt(req.query.month as string);
        const year = parseInt(req.query.year as string);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month e year são obrigatórios' });
        }

        // Calculate date range using the centralized cycle logic
        const { startDate, endDate } = getCycleRange(month, year);

        // Get total count
        const whereClause: any = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };

        if (user.familyGroup?.adminId === user.id) {
            whereClause.user = { familyGroupId: user.familyGroupId };
        } else {
            whereClause.userId = user.id;
        }

        // Get total count
        const total = await prisma.transaction.count({
            where: whereClause
        });

        // Get paginated transactions
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: {
                    select: {
                        name: true,
                        phoneNumber: true
                    }
                }
            }
        });

        res.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({ error: 'Erro ao buscar transações' });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const transactionId = req.params.id;
        const { amount, category, description, type } = req.body;

        // Check if transaction exists and belongs to user
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        if (transaction.userId !== user.id) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        // Update transaction
        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                amount: amount !== undefined ? amount : transaction.amount,
                category: category || transaction.category,
                description: description !== undefined ? description : transaction.description,
                type: type || transaction.type
            }
        });

        res.json(updatedTransaction);
    } catch (error) {
        console.error('Erro ao atualizar transação:', error);
        res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const transactionId = req.params.id;

        // Check if transaction exists and belongs to user
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        if (transaction.userId !== user.id) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        // Delete transaction
        await prisma.transaction.delete({
            where: { id: transactionId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        res.status(500).json({ error: 'Erro ao deletar transação' });
    }
};
