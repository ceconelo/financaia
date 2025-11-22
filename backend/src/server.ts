import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { prisma } from './services/finance.js';
import 'dotenv/config';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Global state para controle do bot
export const botState = {
  connected: false,
  phoneNumber: null as string | null,
  qrCode: null as string | null,
  connectedAt: null as Date | null,
  isReconnecting: false,
};

// Socket.io - para comunicação real-time com frontend
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado ao WebSocket');

  // Enviar estado atual quando cliente conecta
  socket.emit('connection-status', {
    connected: botState.connected,
    phoneNumber: botState.phoneNumber,
    uptime: botState.connectedAt ? Math.floor((Date.now() - botState.connectedAt.getTime()) / 1000) : 0
  });

  // Se houver QR code pendente, enviar
  if (botState.qrCode && !botState.connected) {
    socket.emit('qr', botState.qrCode);
  }

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado');
  });
});

// Exportar io para uso nos services
export { io };

// ============ API ROUTES ============

// GET /api/stats - Estatísticas gerais
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();

    // Parse query params
    const now = new Date();
    const monthParam = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
    const yearParam = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();

    // Calculate start and end dates for the selected month
    const startDate = new Date(yearParam, monthParam - 1, 1);
    const endDate = new Date(yearParam, monthParam, 0, 23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Transactions Today (always today)
    const transactionsToday = await prisma.transaction.count({
      where: {
        createdAt: { gte: today }
      }
    });

    // Transactions Week (always last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const transactionsWeek = await prisma.transaction.count({
      where: {
        createdAt: { gte: weekAgo }
      }
    });

    // Transactions for the selected Month
    const transactionsMonth = await prisma.transaction.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Financials for the selected Month
    const periodTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        type: true,
        amount: true,
        category: true
      }
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: Record<string, number> = {};

    periodTransactions.forEach(t => {
      if (t.type === 'INCOME') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      }
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, total]) => ({ category, total }));

    // Usuários ativos (com transação nos últimos 7 dias - mantendo métrica de atividade recente)
    const activeUsers = await prisma.user.count({
      where: {
        transactions: {
          some: {
            createdAt: { gte: weekAgo }
          }
        }
      }
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers
      },
      transactions: {
        today: transactionsToday,
        week: transactionsWeek,
        month: transactionsMonth
      },
      financials: {
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense
      },
      topCategories,
      period: {
        month: monthParam,
        year: yearParam
      }
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// GET /api/connection/status - Status da conexão WhatsApp
app.get('/api/connection/status', (req, res) => {
  res.json({
    connected: botState.connected,
    phoneNumber: botState.phoneNumber,
    uptime: botState.connectedAt
      ? Math.floor((Date.now() - botState.connectedAt.getTime()) / 1000)
      : 0,
    isReconnecting: botState.isReconnecting
  });
});

// GET /api/users - Lista de usuários
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        xp: true,
        level: true,
        streak: true,
        lastActivity: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
            achievements: true
          }
        }
      },
      orderBy: {
        lastActivity: 'desc'
      },
      take: 50
    });

    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// GET /api/transactions/recent - Transações recentes
app.get('/api/transactions/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const transactions = await prisma.transaction.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            phoneNumber: true,
            name: true
          }
        }
      }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// GET /api/transactions/chart - Dados para gráfico
app.get('/api/transactions/chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        type: true,
        amount: true,
        category: true,
        createdAt: true
      }
    });

    // Agrupar por dia
    const dailyData: Record<string, { date: string; income: number; expense: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { date: dateStr, income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const dateStr = t.createdAt.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        if (t.type === 'INCOME') {
          dailyData[dateStr].income += t.amount;
        } else {
          dailyData[dateStr].expense += t.amount;
        }
      }
    });

    const chartData = Object.values(dailyData).reverse();

    res.json(chartData);
  } catch (error) {
    console.error('Erro ao buscar dados do gráfico:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// GET /api/admin/waitlist - Usuários na fila de espera
app.get('/api/admin/waitlist', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isAuthorized: false,
        email: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fila de espera' });
  }
});

// POST /api/admin/approve - Aprovar usuário
app.post('/api/admin/approve', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'UserId obrigatório' });

    await prisma.user.update({
      where: { id: userId },
      data: { isAuthorized: true }
    });

    // Opcional: Notificar usuário via bot (se tivermos acesso ao socket/bot instance aqui)
    // Por enquanto, apenas libera no banco.

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
});

// GET /api/admin/active-users - Usuários ativos (autorizados)
app.get('/api/admin/active-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isAuthorized: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        lastActivity: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários ativos' });
  }
});

// POST /api/admin/revoke - Revogar acesso
app.post('/api/admin/revoke', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'UserId obrigatório' });

    await prisma.user.update({
      where: { id: userId },
      data: { isAuthorized: false }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao revogar acesso' });
  }
});

// POST /api/chat - Chat de teste (sem WhatsApp)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, phoneNumber } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    const testPhoneNumber = phoneNumber || '5511999999999'; // Número de teste

    // Importar serviços
    const { parseTransaction } = await import('./services/ai.js');
    const {
      getOrCreateUser,
      addTransaction,
      getBalance,
      getMonthlyExpenses
    } = await import('./services/finance.js');
    const { checkAchievements, updateStreak, getUserStats } = await import('./services/gamification.js');

    // Criar/buscar usuário de teste
    const user = await getOrCreateUser(testPhoneNumber);
    await updateStreak(user.id);

    const lowerText = message.toLowerCase().trim();

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
});

const PORT = process.env.API_PORT || 4000;

export function startAPIServer() {
  httpServer.listen(PORT, () => {
    console.log(`🚀 API Server rodando em http://localhost:${PORT}`);
    console.log(`🔌 WebSocket disponível para frontend`);
  });
}
