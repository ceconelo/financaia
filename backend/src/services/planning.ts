import { prisma } from './finance.js';
import { PlanType, PlanStatus } from '@prisma/client';

export async function createPlan(
  userId: string,
  category: string,
  type: PlanType,
  amount: number
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: true },
  });

  if (!user) throw new Error('Usuário não encontrado');

  let status: PlanStatus = 'ACTIVE';
  let familyGroupId = user.familyGroupId;

  // Se faz parte de família
  if (familyGroupId) {
    const family = user.familyGroup!;
    
    // Se não for admin, status é PENDING
    if (family.adminId && family.adminId !== userId) {
      status = 'PENDING';
    } else {
      // Se for admin ou se família não tiver admin (primeiro membro vira admin implicitamente? não, vamos assumir que quem cria é admin)
      // Mas como migramos, pode não ter adminId. Vamos atualizar se for null.
      if (!family.adminId) {
        await prisma.familyGroup.update({
          where: { id: familyGroupId },
          data: { adminId: userId },
        });
      }
    }
  }

  const plan = await prisma.budgetPlan.create({
    data: {
      userId,
      familyGroupId,
      category,
      type,
      amount,
      status,
    },
  });

  return { plan, isPending: status === 'PENDING' };
}

export async function getPlans(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: true },
  });

  if (!user) return { activePlans: [], pendingPlans: [] };

  const where: any = {
    status: 'ACTIVE',
  };

  if (user.familyGroupId) {
    where.familyGroupId = user.familyGroupId;
  } else {
    where.userId = userId;
  }

  const activePlans = await prisma.budgetPlan.findMany({
    where,
    include: { user: true },
  });

  // Se for admin, buscar pendentes também
  let pendingPlans: any[] = [];
  if (user.familyGroupId && user.familyGroup?.adminId === userId) {
    pendingPlans = await prisma.budgetPlan.findMany({
      where: {
        familyGroupId: user.familyGroupId,
        status: 'PENDING',
      },
      include: { user: true },
    });
  }

  return { activePlans, pendingPlans };
}

export async function approvePlan(userId: string, planId: string, approve: boolean) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: true },
  });

  const plan = await prisma.budgetPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !user?.familyGroup) return { error: 'Plano não encontrado' };

  // Verificar se usuário é admin da família do plano
  if (user.familyGroup.id !== plan.familyGroupId || user.familyGroup.adminId !== userId) {
    return { error: 'Apenas o administrador da família pode aprovar planos.' };
  }

  const status = approve ? 'ACTIVE' : 'REJECTED';
  
  await prisma.budgetPlan.update({
    where: { id: planId },
    data: { status },
  });

  return { status };
}

export async function updatePlan(
  userId: string,
  currentCategory: string,
  newAmount?: number,
  newCategory?: string,
  newType?: PlanType
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: true },
  });

  if (!user) return { error: 'Usuário não encontrado' };

  // Buscar plano ativo ou pendente (se for do próprio usuário)
  const plans = await prisma.budgetPlan.findMany({
    where: {
      OR: [
        { userId: userId }, // Meus planos
        { familyGroupId: user.familyGroupId } // Planos da família
      ],
      category: { equals: currentCategory, mode: 'insensitive' },
      status: { in: ['ACTIVE', 'PENDING'] }
    }
  });

  if (plans.length === 0) return { error: 'Plano não encontrado.' };

  // Priorizar plano da família se existir, senão pega o primeiro
  const plan = plans.find(p => p.familyGroupId === user.familyGroupId) || plans[0];

  // Verificação de permissão
  // Se for plano de família, apenas admin pode editar (se estiver ativo)
  // Se for pendente e for do usuário, ele pode editar
  const isFamilyPlan = !!plan.familyGroupId;
  const isAdmin = user.familyGroup?.adminId === userId;
  const isOwner = plan.userId === userId;

  if (isFamilyPlan && plan.status === 'ACTIVE' && !isAdmin) {
    return { error: 'Apenas o administrador da família pode editar planos ativos.' };
  }

  if (!isOwner && !isAdmin) {
    return { error: 'Você não tem permissão para editar este plano.' };
  }

  const data: any = {};
  if (newAmount !== undefined) data.amount = newAmount;
  if (newCategory !== undefined) data.category = newCategory;
  if (newType !== undefined) data.type = newType;

  await prisma.budgetPlan.update({
    where: { id: plan.id },
    data
  });

  return { success: true, plan: { ...plan, ...data } };
}

export async function deletePlan(userId: string, category: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { familyGroup: true },
  });

  if (!user) return { error: 'Usuário não encontrado' };

  // Buscar plano
  const plans = await prisma.budgetPlan.findMany({
    where: {
      OR: [
        { userId: userId },
        { familyGroupId: user.familyGroupId }
      ],
      category: { equals: category, mode: 'insensitive' },
      status: { in: ['ACTIVE', 'PENDING'] }
    }
  });

  if (plans.length === 0) return { error: 'Plano não encontrado.' };

  const plan = plans.find(p => p.familyGroupId === user.familyGroupId) || plans[0];

  const isAdmin = user.familyGroup?.adminId === userId;
  const isOwner = plan.userId === userId;

  if (!isOwner && !isAdmin) {
    return { error: 'Você não tem permissão para excluir este plano.' };
  }

  await prisma.budgetPlan.update({
    where: { id: plan.id },
    data: { status: 'REJECTED' } // Soft delete (mark as rejected/inactive)
  });

  return { success: true };
}
