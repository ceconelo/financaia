import { getBalance, getMonthlyExpenses, getDashboardToken } from '../services/finance.js';
import { getUserStats } from '../services/gamification.js';
import { getFamilyReport } from '../services/family.js';

export const handleFinanceCommands = async (
    userId: string,
    text: string,
    reply: (text: string) => Promise<void>
): Promise<boolean> => {
    const lowerText = text.toLowerCase().trim();

    // Saldo
    if (lowerText === 'saldo' || lowerText === '/saldo') {
        const balance = await getBalance(userId);
        await reply(`💰 *Seu saldo atual:* R$ ${balance.toFixed(2)}`);
        return true;
    }

    // Dashboard
    if (lowerText === 'dashboard' || lowerText === '/dashboard') {
        const token = await getDashboardToken(userId);
        const link = `http://localhost:3000/dashboard?token=${token}`;

        await reply(`📊 *Seu Dashboard Pessoal*\n\nAcesse seu painel exclusivo através deste link:\n\n${link}\n\n⚠️ *Atenção:* Não compartilhe este link com ninguém.`);
        return true;
    }

    // Resumo
    if (lowerText === 'resumo' || lowerText === '/resumo') {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const expenses = await getMonthlyExpenses(userId, month, year);
        const stats = await getUserStats(userId);

        let report = `📊 *Resumo do Mês*\n\n`;
        report += `💸 Total gasto: R$ ${expenses.total.toFixed(2)}\n`;
        report += `📝 Transações: ${expenses.count}\n\n`;
        report += `*Por categoria:*\n`;

        Object.entries(expenses.byCategory).forEach(([cat, amount]) => {
            report += `• ${cat}: R$ ${(amount as number).toFixed(2)}\n`;
        });

        if (stats) {
            report += `\n🎮 *Gamificação*\n`;
            report += `⭐ Nível: ${stats.level}\n`;
            report += `🔥 Streak: ${stats.streak} dias\n`;
            report += `🏆 Conquistas: ${stats.achievements}\n`;
        }

        // Verificar se faz parte de família
        const familyReport = await getFamilyReport(userId);

        if (!familyReport.error && familyReport.total !== undefined) {
            report += `\n👨‍👩‍👧‍👦 *Família: ${familyReport.familyName}*\n`;
            report += `💸 Total Familiar: R$ ${familyReport.total.toFixed(2)}\n`;
            report += `ℹ️ Digite */familia* para detalhes`;
        }

        await reply(report);
        return true;
    }

    return false;
};
