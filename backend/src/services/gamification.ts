import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Badge {
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

const ACHIEVEMENTS: Badge[] = [
  {
    name: 'Primeiro Passo',
    description: 'Registrou seu primeiro gasto!',
    icon: '🎯',
    xpReward: 50,
  },
  {
    name: 'Semana Completa',
    description: 'Registrou gastos por 7 dias seguidos',
    icon: '🔥',
    xpReward: 100,
  },
  {
    name: 'Mestre do Controle',
    description: 'Ficou dentro do orçamento por 30 dias',
    icon: '👑',
    xpReward: 200,
  },
  {
    name: 'Poupador',
    description: 'Teve mais receitas que despesas no mês',
    icon: '💰',
    xpReward: 150,
  },
];

export async function checkAchievements(userId: string): Promise<string[]> {
  const messages: string[] = [];

  // Verificar conquistas
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      transactions: true,
      achievements: { include: { achievement: true } },
    },
  });

  if (!user) return messages;

  // Primeiro Passo
  if (user.transactions.length === 1) {
    const unlocked = await unlockAchievement(userId, 'Primeiro Passo');
    if (unlocked) messages.push('🎉 Conquista desbloqueada: Primeiro Passo! (+50 XP)');
  }

  // Semana Completa (streak)
  if (user.streak >= 7) {
    const unlocked = await unlockAchievement(userId, 'Semana Completa');
    if (unlocked) messages.push('🎉 Conquista desbloqueada: Semana Completa! (+100 XP)');
  }

  return messages;
}

async function unlockAchievement(userId: string, achievementName: string): Promise<boolean> {
  // Buscar ou criar achievement
  let achievement = await prisma.achievement.findUnique({
    where: { name: achievementName },
  });

  if (!achievement) {
    const badge = ACHIEVEMENTS.find((a) => a.name === achievementName);
    if (!badge) return false;

    achievement = await prisma.achievement.create({
      data: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        xpReward: badge.xpReward,
      },
    });
  }

  // Verificar se já foi desbloqueada
  const existing = await prisma.userAchievement.findUnique({
    where: {
      userId_achievementId: {
        userId,
        achievementId: achievement.id,
      },
    },
  });

  if (existing) return false;

  // Desbloquear
  await prisma.userAchievement.create({
    data: {
      userId,
      achievementId: achievement.id,
    },
  });

  // Adicionar XP
  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: {
        increment: achievement.xpReward,
      },
    },
  });

  return true;
}

export async function updateStreak(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const lastActivity = user.lastActivity;

  if (!lastActivity) {
    // Primeira atividade
    await prisma.user.update({
      where: { id: userId },
      data: { streak: 1, lastActivity: now },
    });
    return;
  }

  const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) {
    // Mesma streak
    return;
  } else if (diffHours < 48) {
    // Streak continua
    await prisma.user.update({
      where: { id: userId },
      data: {
        streak: { increment: 1 },
        lastActivity: now,
      },
    });
  } else {
    // Streak quebrada
    await prisma.user.update({
      where: { id: userId },
      data: {
        streak: 1,
        lastActivity: now,
      },
    });
  }
}

export async function getUserStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      achievements: {
        include: { achievement: true },
      },
    },
  });

  if (!user) return null;

  return {
    level: user.level,
    xp: user.xp,
    streak: user.streak,
    achievements: user.achievements.length,
    badges: user.achievements.map((ua) => ({
      name: ua.achievement.name,
      icon: ua.achievement.icon,
    })),
  };
}
