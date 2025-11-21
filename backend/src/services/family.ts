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
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Buscar transações de todos os membros
  const transactions = await prisma.transaction.findMany({
    where: {
      user: { familyGroupId: familyId },
      type: 'EXPENSE',
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { user: true },
  });

  const total = transactions.reduce((acc, t) => acc + t.amount, 0);
  
  const byMember: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  transactions.forEach(t => {
    const memberName = t.user.name || t.user.phoneNumber;
    byMember[memberName] = (byMember[memberName] || 0) + t.amount;
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  return {
    familyName: user.familyGroup.name,
    inviteCode: user.familyGroup.inviteCode,
    total,
    byMember,
    byCategory,
    memberCount: user.familyGroup.members.length,
  };
}
