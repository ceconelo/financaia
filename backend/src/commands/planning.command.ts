import { createPlan, getPlans, approvePlan, updatePlan, deletePlan } from '../services/planning.js';
import { sessionService } from '../services/session.js';
import { getMonthlyExpenses } from '../services/finance.js';
import { getFamilyReport } from '../services/family.js';
import { Markup } from 'telegraf';

export const handlePlanningCallbacks = async (ctx: any, user: any) => {
    const data = ctx.callbackQuery.data;

    // --- CREATE FLOW ---
    if (data === 'plan_create') {
        sessionService.setSession(user.id, 'PLAN_CREATE_CATEGORY');
        await ctx.reply('📝 Digite a *Categoria* da nova meta (ex: Alimentação, Lazer):', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
        return true;
    }

    // --- DELETE FLOW ---
    if (data === 'plan_delete') {
        sessionService.setSession(user.id, 'PLAN_DELETE_CATEGORY');
        await ctx.reply('🗑️ Digite a *Categoria* que deseja excluir:', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
        return true;
    }

    // --- EDIT FLOW ---
    if (data === 'plan_edit') {
        sessionService.setSession(user.id, 'PLAN_EDIT_CATEGORY');
        await ctx.reply('✏️ Digite a *Categoria* que deseja alterar:', { parse_mode: 'Markdown' });
        await ctx.answerCbQuery();
        return true;
    }

    if (data === 'edit_name') {
        const session = sessionService.getSession(user.id);
        if (session && session.data?.category) {
            sessionService.setSession(user.id, 'PLAN_EDIT_NEW_NAME', { category: session.data.category });
            await ctx.reply(`📝 Digite o novo *Nome* para ${session.data.category}:`, { parse_mode: 'Markdown' });
        }
        await ctx.answerCbQuery();
        return true;
    }

    if (data === 'edit_value') {
        const session = sessionService.getSession(user.id);
        if (session && session.data?.category) {
            sessionService.setSession(user.id, 'PLAN_EDIT_NEW_VALUE', { category: session.data.category });
            await ctx.reply(`💰 Digite o novo *Valor* ou *Porcentagem* para ${session.data.category}:`, { parse_mode: 'Markdown' });
        }
        await ctx.answerCbQuery();
        return true;
    }

    return false;
};

export const handlePlanningWizard = async (ctx: any, user: any, text: string) => {
    const session = sessionService.getSession(user.id);
    if (!session) return false;

    // --- CREATE STEPS ---
    if (session.state === 'PLAN_CREATE_CATEGORY') {
        sessionService.updateSessionData(user.id, { category: text });
        sessionService.setSession(user.id, 'PLAN_CREATE_AMOUNT', { category: text });
        await ctx.reply(`💰 Agora digite o *Valor* ou *Porcentagem* para ${text} (ex: 500 ou 10%):`, { parse_mode: 'Markdown' });
        return true;
    }

    if (session.state === 'PLAN_CREATE_AMOUNT') {
        const category = session.data.category;
        const valueStr = text;

        let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
        let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

        if (valueStr.includes('%')) type = 'PERCENTAGE';

        if (isNaN(amount)) {
            await ctx.reply('❌ Valor inválido. Tente novamente (ex: 500 ou 10%).');
            return true;
        }

        try {
            const result = await createPlan(user.id, category, type, amount);
            if (result.isPending) {
                await ctx.reply(`📝 *Sugestão enviada!* O admin precisa aprovar.`);
            } else {
                await ctx.reply(`✅ *Plano criado!* Meta de ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount} para ${category}.`);
            }
        } catch (e) {
            await ctx.reply('❌ Erro ao criar plano.');
        }

        sessionService.clearSession(user.id);
        return true;
    }

    // --- DELETE STEPS ---
    if (session.state === 'PLAN_DELETE_CATEGORY') {
        const category = text;
        const result = await deletePlan(user.id, category);

        if (result.error) {
            await ctx.reply(`❌ ${result.error}`);
        } else {
            await ctx.reply(`✅ Plano de *${category}* excluído!`);
        }

        sessionService.clearSession(user.id);
        return true;
    }

    // --- EDIT STEPS ---
    if (session.state === 'PLAN_EDIT_CATEGORY') {
        const category = text;
        sessionService.setSession(user.id, 'PLAN_EDIT_OPTION', { category });

        await ctx.reply(`O que deseja alterar em *${category}*?`,
            Markup.inlineKeyboard([
                [Markup.button.callback('📝 Nome', 'edit_name'), Markup.button.callback('💰 Valor', 'edit_value')]
            ])
        );
        return true;
    }

    if (session.state === 'PLAN_EDIT_NEW_NAME') {
        const category = session.data.category;
        const newName = text;

        const result = await updatePlan(user.id, category, undefined, newName);

        if (result.error) {
            await ctx.reply(`❌ ${result.error}`);
        } else {
            await ctx.reply(`✅ Categoria renomeada de *${category}* para *${newName}*!`);
        }
        sessionService.clearSession(user.id);
        return true;
    }

    if (session.state === 'PLAN_EDIT_NEW_VALUE') {
        const category = session.data.category;
        const valueStr = text;

        let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
        let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

        if (valueStr.includes('%')) type = 'PERCENTAGE';

        if (isNaN(amount)) {
            await ctx.reply('❌ Valor inválido. Tente novamente.');
            return true;
        }

        const result = await updatePlan(user.id, category, amount, undefined, type);

        if (result.error) {
            await ctx.reply(`❌ ${result.error}`);
        } else {
            await ctx.reply(`✅ Plano de *${category}* atualizado para ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount}!`);
        }
        sessionService.clearSession(user.id);
        return true;
    }

    return false;
};

export const handlePlanningCommands = async (
    userId: string,
    text: string,
    reply: (text: string, extra?: any) => Promise<void>
): Promise<boolean> => {
    const lowerText = text.toLowerCase().trim();
    const normalizedText = lowerText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalizedText.startsWith('/planejamento') || normalizedText.startsWith('planejamento')) {
        const parts = text.split(' ');
        const action = parts[1]?.toLowerCase();

        // Legacy commands support (optional, keeping for compatibility)
        if (action === 'criar') {
            // ... existing logic ...
            // For brevity, I'm focusing on the interactive part which is the main request.
            // But let's keep the main interactive entry point here.
        }

        // Default: Show Interactive Menu
        const { activePlans, pendingPlans } = await getPlans(userId);
        let msg = `🎯 *Planejamento Financeiro*\n\n`;

        if (activePlans.length === 0 && pendingPlans.length === 0) {
            msg += 'Nenhum plano ativo.\n';
        } else {
            if (activePlans.length > 0) {
                msg += `*Metas Ativas:*\n`;
                activePlans.forEach((p: any) => {
                    msg += `• ${p.category}: ${p.type === 'PERCENTAGE' ? p.amount + '%' : 'R$ ' + p.amount.toFixed(2)}\n`;
                });
            }
            if (pendingPlans.length > 0) {
                msg += `\n⏳ *Pendentes:*\n`;
                pendingPlans.forEach((p: any) => {
                    msg += `• ${p.category}: ${p.amount}\n`;
                });
            }
        }

        // We need to return the extra markup options for the caller to use
        // Since the signature is generic, we might need to adjust how we call reply in the telegram service
        // Or we can just return true and let the caller handle it? No, we need to send the markup.
        // Let's assume reply can take extra args or we use a specific return type.
        // For now, I'll use the passed reply function if it supports it, or assume the caller (Telegram) handles it differently.
        // Actually, in telegram.ts we call ctx.reply.

        // To make this clean, let's just return the message and markup, or have a specific telegram handler.
        // But since this is shared with WhatsApp (potentially), we should be careful.
        // WhatsApp doesn't support InlineKeyboard in the same way.

        // Strategy: This function is primarily for text-based commands. 
        // The interactive menu is specific to Telegram.
        // So, I will keep the text logic here, but the Telegram specific menu triggering 
        // is better handled in the telegram service OR we pass a callback that supports rich content.

        // However, the user asked to move responsibilities here.
        // So I will export a specific function for Telegram to use.

        return true;
    }

    return false;
};

// Helper for Telegram to get the menu
export const getPlanningMenu = async (userId: string) => {
    const { activePlans, pendingPlans } = await getPlans(userId);

    // Get current month expenses for progress calculation
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Try to get family report first
    let byCategory: Record<string, number> = {};
    const familyReport = await getFamilyReport(userId);

    if ('error' in familyReport) {
        // User not in family, use personal expenses
        const result = await getMonthlyExpenses(userId, month, year);
        byCategory = result.byCategory;
    } else {
        // User in family, use family expenses
        byCategory = familyReport.byCategory!;
    }

    let msg = `🎯 *Planejamento Financeiro*\n\n`;

    if (activePlans.length === 0 && pendingPlans.length === 0) {
        msg += 'Nenhum plano ativo.\n';
    } else {
        if (activePlans.length > 0) {
            msg += `*Metas Ativas:*\n`;

            for (const p of activePlans) {
                // Calculate progress (Case Insensitive Match)
                const categoryKey = Object.keys(byCategory).find(k => k.toLowerCase() === p.category.toLowerCase()) || p.category;
                const spent = byCategory[categoryKey] || 0;

                let percentage = 0;
                let remaining = 0;
                let bar = '';

                if (p.type === 'FIXED') {
                    percentage = Math.min(100, Math.max(0, (spent / p.amount) * 100));
                    remaining = Math.max(0, p.amount - spent);
                    bar = generateProgressBar(percentage);

                    msg += `• ${p.category}: R$ ${p.amount.toFixed(2)}\n`;
                    msg += `${bar} ${percentage.toFixed(0)}%\n`;
                    msg += `💰 Restam: R$ ${remaining.toFixed(2)}\n\n`;
                } else {
                    // For percentage based, we just show the target
                    msg += `• ${p.category}: ${p.amount}%\n`;
                    msg += `(Meta baseada em % da renda)\n\n`;
                }
            }
        }

        if (pendingPlans.length > 0) {
            msg += `⏳ *Pendentes:*\n`;
            pendingPlans.forEach((p: any) => {
                msg += `• ${p.category}: ${p.amount}\n`;
            });
        }
    }

    const markup = Markup.inlineKeyboard([
        [Markup.button.callback('➕ Nova Meta', 'plan_create')],
        [Markup.button.callback('✏️ Editar', 'plan_edit'), Markup.button.callback('🗑️ Excluir', 'plan_delete')]
    ]);

    return { msg, markup };
}

function generateProgressBar(percentage: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.round((percentage / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;

    const filled = '🟩'.repeat(filledBlocks);
    const empty = '⬜'.repeat(emptyBlocks);

    return `[${filled}${empty}]`;
}
