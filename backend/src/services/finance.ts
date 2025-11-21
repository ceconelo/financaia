import { PrismaClient, TransactionType } from '@prisma/client';

export const prisma = new PrismaClient();

export async function getOrCreateUser(phoneNumber: string) {
  let user = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber,
        xp: 0,
        level: 1,
        streak: 0,
      },
    });
    console.log('✨ Novo usuário criado:', phoneNumber);
  }

  return user;
}

export async function addTransaction(
  userId: string,
  amount: number,
  type: TransactionType,
  category: string,
  description?: string
) {
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount,
      type,
      category,
      description,
    },
  });

  // Adicionar XP
  const xpGained = 10;
  await addXP(userId, xpGained);

  return { transaction, xpGained };
}

export async function getBalance(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
  });

  const balance = transactions.reduce((acc, t) => {
    return t.type === 'INCOME' ? acc + t.amount : acc - t.amount;
  }, 0);

  return balance;
}

export async function getMonthlyExpenses(userId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const expenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);
  
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return { total, byCategory, count: expenses.length };
}

export async function setBudget(
  userId: string,
  category: string,
  limit: number,
  month: number,
  year: number
) {
  return await prisma.budget.upsert({
    where: {
      userId_category_month_year: {
        userId,
        category,
        month,
        year,
      },
    },
    update: { limit },
    create: {
      userId,
      category,
      limit,
      month,
      year,
    },
  });
}

export async function checkBudgetAlert(userId: string, category: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const budget = await prisma.budget.findUnique({
    where: {
      userId_category_month_year: {
        userId,
        category,
        month,
        year,
      },
    },
  });

  if (!budget) return null;

  const { byCategory } = await getMonthlyExpenses(userId, month, year);
  const spent = byCategory[category] || 0;
  const percentage = (spent / budget.limit) * 100;

  if (percentage >= 90) {
    return {
      alert: true,
      message: `⚠️ Você já gastou R$ ${spent.toFixed(2)} de R$ ${budget.limit.toFixed(2)} em ${category} este mês (${percentage.toFixed(0)}%)`,
      percentage,
    };
  }

  return null;
}

async function addXP(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const newXP = user.xp + amount;
  const newLevel = calculateLevel(newXP);

  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: newLevel,
      lastActivity: new Date(),
    },
  });

  return { newXP, newLevel, leveledUp: newLevel > user.level };
}

function calculateLevel(xp: number): number {
  // 100 XP para level 2, depois aumenta 50 XP por level
  return Math.floor(1 + xp / 100);
}
