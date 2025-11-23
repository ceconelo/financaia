import { Request, Response } from 'express';
import { parseTransaction } from '../services/ai.js';
import {
    getOrCreateUser,
    addTransaction,
    getBalance,
    getMonthlyExpenses,
    getDashboardToken
} from '../services/finance.js';
import { checkAchievements, updateStreak, getUserStats } from '../services/gamification.js';

export const handleChat = async (req: Request, res: Response) => {
    try {
        const { message, phoneNumber } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Mensagem é obrigatória' });
        }

        const testPhoneNumber = phoneNumber || '5511999999999'; // Número de teste

        // Criar/buscar usuário de teste
        const user = await getOrCreateUser(testPhoneNumber);
        await updateStreak(user.id);

        const lowerText = message.toLowerCase().trim();
        console.log('DEBUG: Received message:', lowerText);

        // Comandos especiais
        if (lowerText === 'saldo' || lowerText === '/saldo') {
            const balance = await getBalance(user.id);
            return res.json({
                type: 'info',
                message: `💰 *Seu saldo atual:* R$ ${balance.toFixed(2)}`
            });
        }

        if (lowerText === 'resumo' || lowerText === '/resumo') {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const expenses = await getMonthlyExpenses(user.id, month, year);
            const stats = await getUserStats(user.id);

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

            return res.json({
                type: 'info',
                message: report
            });
        }

        if (lowerText === 'dashboard' || lowerText === '/dashboard') {
            const token = await getDashboardToken(user.id);
            const link = `http://localhost:3000/dashboard?token=${token}`;

            return res.json({
                type: 'info',
                message: `📊 *Seu Dashboard Pessoal*\n\nAcesse seu painel exclusivo através deste link:\n\n${link}\n\n⚠️ *Atenção:* Não compartilhe este link com ninguém.`
            });
        }

        if (lowerText === 'ajuda' || lowerText === '/ajuda' || lowerText === 'oi' || lowerText === 'olá') {
            const help = `👋 *Olá! Sou seu assistente financeiro FinancaIA!*
    
📱 *Como usar:*
• Digite mensagens como: "Gastei 50 reais em pizza"
• Experimente: "Recebi 3000 de salário"

💬 *Comandos:*
• *saldo* - Ver saldo atual
• *resumo* - Relatório do mês
• *ajuda* - Ver esta mensagem

🎮 Ganhe XP e conquistas registrando suas finanças!`;

            return res.json({
                type: 'info',
                message: help
            });
        }

        // Processar como transação com IA
        const transactionData = await parseTransaction(message);

        if (!transactionData) {
            return res.json({
                type: 'error',
                message: '🤔 Não entendi. Tente algo como: "Gastei 50 reais em pizza" ou digite *ajuda*'
            });
        }

        const { transaction, xpGained } = await addTransaction(
            user.id,
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
        const achievements = await checkAchievements(user.id);
        if (achievements.length > 0) {
            response += '\n\n' + achievements.join('\n');
        }

        res.json({
            type: 'success',
            message: response,
            transaction: {
                id: transaction.id,
                amount: transactionData.amount,
                type: transactionData.type,
                category: transactionData.category,
                xpGained
            }
        });
    } catch (error) {
        console.error('Erro no chat:', error);
        res.status(500).json({
            type: 'error',
            error: 'Erro ao processar mensagem'
        });
    }
};
