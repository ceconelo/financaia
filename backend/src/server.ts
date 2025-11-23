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

// ============ MIDDLEWARES ============

// Middleware de autenticação (Header ou Query Param)
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    let token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

    // Fallback para query param (para compatibilidade/magic link)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token missing' });
    }

    const user = await prisma.user.findUnique({
      where: { dashboardToken: token }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Anexar usuário ao request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error during auth' });
  }
};

// Middleware de Admin
const authenticateAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // TODO: Implementar lógica real de admin.
  // Por enquanto, vamos verificar se existe um header 'x-admin-secret' ou se o usuário autenticado tem role 'ADMIN'
  // Como não temos autenticação nas rotas de admin ainda, vamos usar um segredo simples via env ou hardcoded para teste.

  const adminSecret = process.env.ADMIN_SECRET || 'admin123'; // Em produção, use uma variável de ambiente forte!
  const requestSecret = req.headers['x-admin-secret'];

  if (requestSecret === adminSecret) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Admin access only' });
};

// Middleware para validar requisições do Bot/Chat
const validateBotRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Em produção, o bot deve enviar um secret compartilhado
  // Para teste local, permitimos localhost ou um secret específico

  const botSecret = process.env.BOT_SECRET || 'bot_secret_123';
  const requestSecret = req.headers['x-bot-secret'];

  // Permitir se vier do localhost (para testes locais simples)
  const remoteAddress = req.socket.remoteAddress;
  const isLocalhost = remoteAddress === '::1' || remoteAddress === '127.0.0.1' || remoteAddress === '::ffff:127.0.0.1';

  if (requestSecret === botSecret || isLocalhost) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Bot access only' });
};

// ============ API ROUTES ============

// GET /api/stats - Estatísticas gerais
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.id;

    // ... (rest of stats logic using user object)
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

    // Transactions Today (USER ONLY)
    const transactionsToday = await prisma.transaction.count({
      where: {
        userId,
        createdAt: { gte: today }
      }
    });

    // Transactions Week (USER ONLY)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const transactionsWeek = await prisma.transaction.count({
      where: {
        userId,
        createdAt: { gte: weekAgo }
      }
    });

    // Transactions for the selected Month (USER ONLY)
    const transactionsMonth = await prisma.transaction.count({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Financials for the selected Month (USER ONLY)
    const periodTransactions = await prisma.transaction.findMany({
      where: {
        userId,
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

    // Se tiver família, somar dados da família?
    // O requisito diz "Somente o dele e/ou familiar".
    // Por simplicidade agora, vou focar no usuário individual, mas se ele for admin de família poderia ver tudo.
    // Vamos deixar individual por enquanto para garantir segurança.

    res.json({
      users: {
        total: totalUsers, // Mantendo global
        active: 0 // Removendo active users global do contexto pessoal
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
      },
      user: {
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        id: user.id,
        familyGroupId: user.familyGroupId,
        isFamilyAdmin: user.familyGroupId ? (await prisma.familyGroup.findUnique({ where: { id: user.familyGroupId } }))?.adminId === user.id : false
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

// GET /api/users - Lista de usuários (PROTECTED ADMIN)
app.get('/api/users', authenticateAdmin, async (req, res) => {
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

// GET /api/transactions/recent - Transações recentes (PROTECTED)
app.get('/api/transactions/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    // TODO: Filter by authenticated user? Currently returns all.
    // Assuming this is for admin or global view? Or should be user specific?
    // Based on previous code, it returned ALL transactions.
    // Let's restrict to authenticated user for safety.

    const user = (req as any).user;

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
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

// GET /api/transactions/chart - Dados para gráfico (PROTECTED)
app.get('/api/transactions/chart', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
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

// DELETE /api/transactions/reset - Resetar dados do mês (PROTECTED)
app.delete('/api/transactions/reset', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year) {
      return res.status(400).json({ error: 'Month e year são obrigatórios' });
    }

    // Calculate start and end dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    let whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Check if user is family admin to delete family data
    // Need to fetch family info as it might not be fully populated in 'user' object from auth middleware
    // (Auth middleware uses findUnique, which by default doesn't include relations unless specified)
    // But we can check familyGroupId on the user object.

    // Re-fetch user with family info to be sure about admin status
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { familyGroup: true }
    });

    if (fullUser?.familyGroupId && fullUser.familyGroup?.adminId === fullUser.id) {
      const familyMembers = await prisma.user.findMany({
        where: { familyGroupId: fullUser.familyGroupId },
        select: { id: true }
      });
      const memberIds = familyMembers.map(m => m.id);
      whereClause.userId = { in: memberIds };
    } else {
      whereClause.userId = user.id;
    }

    const result = await prisma.transaction.deleteMany({
      where: whereClause
    });

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Erro ao resetar dados:', error);
    res.status(500).json({ error: 'Erro ao resetar dados' });
  }
});

// GET /api/transactions - List transactions with pagination (PROTECTED)
app.get('/api/transactions', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month e year são obrigatórios' });
    }

    // Calculate date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get total count
    const total = await prisma.transaction.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get paginated transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// PUT /api/transactions/:id - Update transaction (PROTECTED)
app.put('/api/transactions/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const transactionId = req.params.id;
    const { amount, category, description, type } = req.body;

    // Check if transaction exists and belongs to user
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    if (transaction.userId !== user.id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        amount: amount !== undefined ? amount : transaction.amount,
        category: category || transaction.category,
        description: description !== undefined ? description : transaction.description,
        type: type || transaction.type
      }
    });

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// DELETE /api/transactions/:id - Delete transaction (PROTECTED)
app.delete('/api/transactions/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const transactionId = req.params.id;

    // Check if transaction exists and belongs to user
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    if (transaction.userId !== user.id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id: transactionId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    res.status(500).json({ error: 'Erro ao deletar transação' });
  }
});

// GET /api/admin/waitlist - Usuários na fila de espera (PROTECTED ADMIN)
app.get('/api/admin/waitlist', authenticateAdmin, async (req, res) => {
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

// POST /api/admin/approve - Aprovar usuário (PROTECTED ADMIN)
app.post('/api/admin/approve', authenticateAdmin, async (req, res) => {
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

// GET /api/admin/active-users - Usuários ativos (PROTECTED ADMIN)
app.get('/api/admin/active-users', authenticateAdmin, async (req, res) => {
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

// POST /api/admin/revoke - Revogar acesso (PROTECTED ADMIN)
app.post('/api/admin/revoke', authenticateAdmin, async (req, res) => {
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
app.post('/api/chat', validateBotRequest, async (req, res) => {
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
      const { getDashboardToken } = await import('./services/finance.js');
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
});

const PORT = process.env.API_PORT || 4000;

export function startAPIServer() {
  httpServer.listen(PORT, () => {
    console.log(`🚀 API Server rodando em http://localhost:${PORT}`);
    console.log(`🔌 WebSocket disponível para frontend`);
  });
}
