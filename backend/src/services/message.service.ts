import { handleAuthFlow, handleSystemCommands } from '../commands/system.command.js';
import { handleFinanceCommands } from '../commands/finance.command.js';
import { handleFamilyCommands } from '../commands/family.command.js';
import { handlePlanningCommands } from '../commands/planning.command.js';
import { parseTransaction } from './ai.js';
import { addTransaction, checkBudgetAlert } from './finance.js';
import { checkAchievements } from './gamification.js';

export async function processUserMessage(
    userId: string,
    text: string,
    reply: (text: string) => Promise<void>
) {
    // 1. Auth Flow (Gatekeeper)
    const handledAuth = await handleAuthFlow(userId, text, reply);
    if (handledAuth) return;

    // 2. Finance Commands
    if (await handleFinanceCommands(userId, text, reply)) return;

    // 3. Family Commands
    if (await handleFamilyCommands(userId, text, reply)) return;

    // 4. Planning Commands
    if (await handlePlanningCommands(userId, text, reply)) return;

    // 5. System Commands (Help, Name)
    if (await handleSystemCommands(userId, text, reply)) return;

    // 6. AI Transaction Processing (Fallback)
    const transactionData = await parseTransaction(text);

    if (!transactionData) {
        await reply('🤔 Não entendi. Tente algo como: "Gastei 50 reais em pizza" ou digite *ajuda*');
        return;
    }

    const { transaction, xpGained } = await addTransaction(
        userId,
        transactionData.amount,
        transactionData.type,
        transactionData.category,
        transactionData.description
    );

    const emoji = transactionData.type === 'INCOME' ? '💵' : '💸';
    let response = `${emoji} *Registrado!*\n\n`;
    response += `Valor: R$ ${transactionData.amount.toFixed(2)}\n`;
    response += `Categoria: ${transactionData.category}\n`;
    response += `Tipo: ${transactionData.type === 'INCOME' ? 'Receita' : 'Despesa'}\n`;
    response += `\n🎮 +${xpGained} XP`;

    // Verificar conquistas
    const achievements = await checkAchievements(userId);
    if (achievements.length > 0) {
        response += '\n\n' + achievements.join('\n');
    }

    // Verificar alertas de orçamento
    const alert = await checkBudgetAlert(userId, transactionData.category);
    if (alert) {
        response += '\n\n' + alert.message;
    }

    await reply(response);
}
