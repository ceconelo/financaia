import { createPlan, getPlans, approvePlan, updatePlan } from '../services/planning.js';

export const handlePlanningCommands = async (
    userId: string,
    text: string,
    reply: (text: string) => Promise<void>
): Promise<boolean> => {
    const lowerText = text.toLowerCase().trim();
    const normalizedText = lowerText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalizedText.startsWith('/planejamento') || normalizedText.startsWith('planejamento')) {
        const parts = text.split(' ');
        const action = parts[1]?.toLowerCase();

        if (action === 'criar') {
            // /planejamento criar [categoria] [valor]
            const category = parts[2];
            const valueStr = parts[3];

            if (!category || !valueStr) {
                await reply('⚠️ Use: `/planejamento criar [Categoria] [Valor]`\nEx: `/planejamento criar Alimentação 500` ou `/planejamento criar Lazer 10%`');
                return true;
            }

            let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
            let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

            if (valueStr.includes('%')) {
                type = 'PERCENTAGE';
            }

            if (isNaN(amount)) {
                await reply('❌ Valor inválido.');
                return true;
            }

            try {
                const result = await createPlan(userId, category, type, amount);
                if (result.isPending) {
                    await reply(`📝 *Sugestão enviada!* O administrador da família precisa aprovar este plano.`);
                } else {
                    await reply(`✅ *Plano criado!* Meta de ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount} para ${category}.`);
                }
            } catch (e) {
                await reply('❌ Erro ao criar plano.');
            }
            return true;
        }

        if (action === 'aprovar') {
            const planId = parts[2];
            if (!planId) return true;
            const result = await approvePlan(userId, planId, true);
            if (result.error) await reply(`❌ ${result.error}`);
            else await reply('✅ Plano aprovado!');
            return true;
        }

        if (action === 'editar') {
            // /planejamento editar [Categoria] [Novo Valor]
            const category = parts[2];
            const valueStr = parts[3];

            if (!category || !valueStr) {
                await reply('⚠️ Use: `/planejamento editar [Categoria] [Novo Valor]`');
                return true;
            }

            let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
            let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

            if (valueStr.includes('%')) type = 'PERCENTAGE';
            if (isNaN(amount)) {
                await reply('❌ Valor inválido.');
                return true;
            }

            const result = await updatePlan(userId, category, amount, undefined, type);

            if (result.error) await reply(`❌ ${result.error}`);
            else await reply(`✅ Plano de *${category}* atualizado para ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount}!`);
            return true;
        }

        if (action === 'renomear') {
            // /planejamento renomear [Categoria Atual] [Novo Nome]
            const currentCategory = parts[2];
            const newCategory = parts[3];

            if (!currentCategory || !newCategory) {
                await reply('⚠️ Use: `/planejamento renomear [Categoria Atual] [Novo Nome]`');
                return true;
            }

            const result = await updatePlan(userId, currentCategory, undefined, newCategory);

            if (result.error) await reply(`❌ ${result.error}`);
            else await reply(`✅ Categoria renomeada de *${currentCategory}* para *${newCategory}*!`);
            return true;
        }

        if (action === 'deletar' || action === 'excluir') {
            const category = parts[2];
            if (!category) {
                await reply('⚠️ Use: `/planejamento deletar [Categoria]`');
                return true;
            }

            const { deletePlan } = await import('../services/planning.js');
            const result = await deletePlan(userId, category);

            if (result.error) await reply(`❌ ${result.error}`);
            else await reply(`✅ Plano de *${category}* excluído!`);
            return true;
        }

        // Listar planos
        const { activePlans, pendingPlans } = await getPlans(userId);
        let msg = `🎯 *Planejamento Financeiro*\n\n`;

        if (activePlans.length === 0 && pendingPlans.length === 0) {
            msg += 'Nenhum plano ativo.\n\n';
        } else {
            if (activePlans.length > 0) {
                msg += `*Metas Ativas:*\n`;
                activePlans.forEach((p: any) => {
                    msg += `• ${p.category}: ${p.type === 'PERCENTAGE' ? p.amount + '%' : 'R$ ' + p.amount.toFixed(2)}\n`;
                });
            }

            if (pendingPlans.length > 0) {
                msg += `\n⏳ *Pendentes de Aprovação:*\n`;
                pendingPlans.forEach((p: any) => {
                    msg += `• ${p.category} (${p.user.name || 'Membro'}): ${p.type === 'PERCENTAGE' ? p.amount + '%' : 'R$ ' + p.amount.toFixed(2)}\n`;
                    msg += `  _Aprovar:_ \`/planejamento aprovar ${p.id}\`\n`;
                });
            }
        }

        msg += `\n──────────────────\n`;
        msg += `⚙️ *Gerenciar Metas:*\n`;
        msg += `• *Criar:* \`/planejamento criar [Categoria] [Valor]\`\n`;
        msg += `• *Alterar:* \`/planejamento editar [Categoria] [Valor]\`\n`;
        msg += `• *Excluir:* \`/planejamento deletar [Categoria]\`\n`;
        msg += `_Ex: /planejamento criar Lazer 500_`;

        await reply(msg);
        return true;
    }

    return false;
};
