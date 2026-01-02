import { prisma } from './finance.js';
import { randomBytes } from 'crypto';

export async function createFamilyGroup(userId: string, familyName?: string) {
  // Verificar se usuário já tem família
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: true },
  });

  if (user?.familyGroup) {
    return {
      error: 'Você já faz parte de uma família!',
      familyGroup: user.familyGroup,
    };
  }

  // Gerar código único
  let inviteCode = '';
  let isUnique = false;
  while (!isUnique) {
    inviteCode = randomBytes(3).toString('hex').toUpperCase(); // 6 caracteres
    const existing = await prisma.familyGroup.findUnique({
      where: { inviteCode },
    });
    if (!existing) isUnique = true;
  }

  const name = familyName || `Família de ${user?.name || 'Usuário'}`;

  const familyGroup = await prisma.familyGroup.create({
    data: {
      name,
      inviteCode,
      members: {
        connect: { id: userId },
      },
    },
  });

  return { familyGroup };
}

export async function joinFamilyGroup(userId: string, inviteCode: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: true },
  });

  if (user?.familyGroup) {
    return { error: 'Você já faz parte de uma família!' };
  }

  const familyGroup = await prisma.familyGroup.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
  });

  if (!familyGroup) {
    return { error: 'Código de convite inválido.' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      familyGroupId: familyGroup.id,
    },
  });

  return { familyGroup };
}

export async function getFamilyReport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: { include: { members: true } } },
  });

  if (!user?.familyGroup) {
    return { error: 'Você não faz parte de uma família.' };
  }

  const familyId = user.familyGroup.id;
  const now = new Date();
  const day = now.getDate();
  let startDate: Date;
  let endDate: Date;

  if (day <= 8) {
    // Ciclo termina no dia 8 deste mês, começou no dia 9 do mês passado
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 9, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 8, 23, 59, 59);
  } else {
    // Ciclo começou no dia 9 deste mês, termina no dia 8 do mês que vem
    startDate = new Date(now.getFullYear(), now.getMonth(), 9, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 8, 23, 59, 59);
  }

  // Buscar transações de todos os membros
  const transactions = await prisma.transaction.findMany({
    where: {
      user: { familyGroupId: familyId },
      // Remover filtro de tipo para pegar tudo
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { user: true },
  });

  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const incomes = transactions.filter(t => t.type === 'INCOME');

  const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
  const totalAvailable = totalIncome - totalExpense;

  const byMember: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  // Processar apenas despesas para os gráficos de gasto
  expenses.forEach(t => {
    const memberName = t.user.name || t.user.phoneNumber;
    byMember[memberName] = (byMember[memberName] || 0) + t.amount;
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  // Buscar planos ativos da família
  const plans = await prisma.budgetPlan.findMany({
    where: {
      familyGroupId: familyId,
      status: 'ACTIVE',
    },
  });

  const budgets: Record<string, { limit: number, spent: number, remaining: number, percentage: number }> = {};

  plans.forEach(plan => {
    // Normalizar categoria para comparar (case insensitive)
    const categoryKey = Object.keys(byCategory).find(k => k.toLowerCase() === plan.category.toLowerCase()) || plan.category;
    const spent = byCategory[categoryKey] || 0;

    if (plan.type === 'FIXED') {
      const limit = plan.amount;
      const remaining = Math.max(0, limit - spent);
      const percentage = Math.min(100, (spent / limit) * 100);
      budgets[categoryKey] = { limit, spent, remaining, percentage };
    }
  });

  return {
    familyName: user.familyGroup.name,
    inviteCode: user.familyGroup.inviteCode,
    totalIncome,
    totalExpense,
    totalAvailable,
    byMember,
    byCategory,
    budgets,
    memberCount: user.familyGroup.members.length,
  };
}
