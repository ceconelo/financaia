import { createFamilyGroup, joinFamilyGroup, getFamilyReport } from '../services/family.js';

export const handleFamilyCommands = async (
    userId: string,
    text: string,
    reply: (text: string) => Promise<void>
): Promise<boolean> => {
    const lowerText = text.toLowerCase().trim();
    const normalizedText = lowerText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (normalizedText.startsWith('/familia') || normalizedText.startsWith('familia')) {
        const parts = normalizedText.split(' ');
        const action = parts[1];

        if (action === 'criar') {
            const result = await createFamilyGroup(userId);
            if (result.error) {
                await reply(`❌ ${result.error}`);
            } else {
                await reply(`🎉 *Família criada com sucesso!*\n\nCódigo de convite: *${result.familyGroup!.inviteCode}*\n\nCompartilhe este código com quem você quer adicionar à família.`);
            }
            return true;
        }

        if (action === 'entrar') {
            // Pegar o código original (sem lowerCase) mas limpar brackets se houver
            let code = text.split(' ')[2] || '';
            code = code.replace(/[\[\]]/g, '').trim();

            if (!code) {
                await reply('⚠️ Use: `/familia entrar [codigo]`');
                return true;
            }
            const result = await joinFamilyGroup(userId, code);
            if (result.error) {
                await reply(`❌ ${result.error}`);
            } else {
                await reply(`🎉 *Você entrou na família ${result.familyGroup!.name}!*`);
            }
            return true;
        }

        // Relatório da família (default)
        const report = await getFamilyReport(userId);
        if (report.error) {
            await reply(`👨‍👩‍👧‍👦 *Conta Familiar*\n\nVocê ainda não faz parte de uma família.\n\n*Comandos:*\n• \`/familia criar\` - Criar nova família\n• \`/familia entrar [codigo]\` - Entrar em uma família existente`);
        } else {
            let msg = `👨‍👩‍👧‍👦 *Família: ${report.familyName}*\n`;
            msg += `🔑 Código: \`${report.inviteCode}\`\n`;
            msg += `👥 ${report.memberCount} Membros\n\n`;
            msg += `💰 *Saldo: R$ ${report.totalIncome!.toFixed(2)}*\n`;
            msg += `💸 *Total Despesas: R$ ${report.totalExpense!.toFixed(2)}*\n`;
            msg += `✅ *Total Disponível: R$ ${report.totalAvailable!.toFixed(2)}*\n`;
            msg += `──────────────────\n`;

            msg += `👤 *Por Membro:*\n`;
            Object.entries(report.byMember!).forEach(([name, amount]) => {
                const safeName = name.replace(/_/g, '\\_').replace(/\*/g, '\\*').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
                msg += `• ${safeName}: R$ ${amount.toFixed(2)}\n`;
            });
            msg += `──────────────────\n`;

            msg += `📊 *Por Categoria:*\n\n`;

            // Helper para barra de progresso
            const getProgressBar = (percentage: number) => {
                const totalBars = 10;
                const filledBars = Math.min(totalBars, Math.round((percentage / 100) * totalBars));
                const emptyBars = totalBars - filledBars;
                const filled = '🟩'.repeat(filledBars);
                const empty = '⬜'.repeat(emptyBars);
                return `${filled}${empty}`;
            };

            Object.entries(report.byCategory!).forEach(([category, amount]) => {
                const budget = report.budgets?.[category];

                msg += `*${category}*\n`;

                if (budget) {
                    const percentage = Math.min(100, (amount / budget.limit) * 100); // % gasto
                    const progressBar = getProgressBar(percentage);

                    msg += `R$ ${amount.toFixed(2)} de R$ ${budget.limit.toFixed(2)}\n`;
                    msg += `${progressBar} ${percentage.toFixed(0)}%\n`;

                    if (amount > budget.limit) {
                        msg += `🚨 *Estourou: R$ ${(amount - budget.limit).toFixed(2)}*\n`;
                    } else {
                        msg += `💰 Restam: R$ ${budget.remaining.toFixed(2)}\n`;
                    }
                } else {
                    msg += `R$ ${amount.toFixed(2)}\n`;
                    msg += `_(Sem meta)_\n`;
                }
                msg += `\n`;
            });

            await reply(msg);
        }
        return true;
    }

    return false;
};
