import { Request, Response } from 'express';
import { prisma } from '../services/finance.js';

export const getStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user.id;

        const totalUsers = await prisma.user.count();

        // Parse query params
        const now = new Date();
        const monthParam = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
        const yearParam = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();

        // Calculate start and end dates for the selected month
        const startDate = new Date(yearParam, monthParam - 1, 1);
        const endDate = new Date(yearParam, monthParam, 0, 23, 59, 59, 999);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Transactions Today (USER ONLY)
        const transactionsToday = await prisma.transaction.count({
            where: {
                userId,
                createdAt: { gte: today }
            }
        });

        // Transactions Week (USER ONLY)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const transactionsWeek = await prisma.transaction.count({
            where: {
                userId,
                createdAt: { gte: weekAgo }
            }
        });

        // Transactions for the selected Month (USER ONLY)
        const transactionsMonth = await prisma.transaction.count({
            where: {
                userId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Financials for the selected Month (USER ONLY)
        const periodTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                type: true,
                amount: true,
                category: true
            }
        });

        let totalIncome = 0;
        let totalExpense = 0;
        const categoryTotals: Record<string, number> = {};

        periodTransactions.forEach(t => {
            if (t.type === 'INCOME') {
                totalIncome += t.amount;
            } else {
                totalExpense += t.amount;
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
        });

        const topCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, total]) => ({ category, total }));

        res.json({
            users: {
                total: totalUsers,
                active: 0
            },
            transactions: {
                today: transactionsToday,
                week: transactionsWeek,
                month: transactionsMonth
            },
            financials: {
                income: totalIncome,
                expense: totalExpense,
                balance: totalIncome - totalExpense
            },
            topCategories,
            period: {
                month: monthParam,
                year: yearParam
            },
            user: {
                name: user.name,
                phoneNumber: user.phoneNumber,
                role: user.role,
                id: user.id,
                familyGroupId: user.familyGroupId,
                isFamilyAdmin: user.familyGroupId ? (await prisma.familyGroup.findUnique({ where: { id: user.familyGroupId } }))?.adminId === user.id : false
            }
        });
    } catch (error) {
        console.error('Erro ao buscar stats:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
};
