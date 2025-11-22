import { prisma } from './finance.js';

export async function checkAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAuthorized: true }
  });
  return user?.isAuthorized || false;
}

export async function validateKey(userId: string, key: string) {
  const accessKey = await prisma.accessKey.findUnique({
    where: { key }
  });

  if (!accessKey) {
    return { error: 'Chave inválida.' };
  }

  if (accessKey.isUsed) {
    return { error: 'Esta chave já foi utilizada.' };
  }

  // Ativar chave e autorizar usuário
  await prisma.$transaction([
    prisma.accessKey.update({
      where: { id: accessKey.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedByUserId: userId
      }
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isAuthorized: true }
    })
  ]);

  return { success: true };
}

export async function generateKey() {
  const key = Math.random().toString(36).substring(2, 10).toUpperCase();
  return await prisma.accessKey.create({
    data: { key }
  });
}
