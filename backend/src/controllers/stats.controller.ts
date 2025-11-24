import { Request, Response } from 'express';
import { prisma } from '../services/finance.js';

export const getStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user.id;
        const isFamilyAdmin = user.familyGroup?.adminId === user.id;
        const userFilter = isFamilyAdmin ? { user: { familyGroupId: user.familyGroupId } } : { userId };

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

        // Transactions Today
        const transactionsToday = await prisma.transaction.count({
            where: {
                ...userFilter,
                createdAt: { gte: today }
            }
        });

        // Transactions Week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const transactionsWeek = await prisma.transaction.count({
            where: {
                ...userFilter,
                createdAt: { gte: weekAgo }
            }
        });

        // Transactions for the selected Month
        const transactionsMonth = await prisma.transaction.count({
            where: {
                ...userFilter,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Financials for the selected Month
        const periodTransactions = await prisma.transaction.findMany({
            where: {
                ...userFilter,
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
                isFamilyAdmin
            }
        });
    } catch (error) {
        console.error('Erro ao buscar stats:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
};
