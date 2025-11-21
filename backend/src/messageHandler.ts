import { WASocket, WAMessage, downloadMediaMessage, proto } from '@whiskeysockets/baileys';
import { parseTransaction, transcribeAudio, analyzeReceipt } from './services/ai.js';
import { 
  getOrCreateUser, 
  addTransaction, 
  getBalance, 
  getMonthlyExpenses,
  checkBudgetAlert 
} from './services/finance.js';
import { checkAchievements, updateStreak, getUserStats } from './services/gamification.js';

export async function handleMessage(sock: WASocket, message: WAMessage) {
  const from = message.key.remoteJid!;
  const msg = message.message;
  
  if (!msg) return;

  // Extrair número de telefone
  const phoneNumber = from.replace('@s.whatsapp.net', '');
  const user = await getOrCreateUser(phoneNumber);

  // Atualizar streak
  await updateStreak(user.id);

  try {
    // Texto
    if (msg.conversation || msg.extendedTextMessage?.text) {
      const text = msg.conversation || msg.extendedTextMessage?.text || '';
      await handleTextMessage(sock, from, user.id, text);
    }
    
    // Áudio
    else if (msg.audioMessage) {
      await handleAudioMessage(sock, from, user.id, message);
    }
    
    // Imagem
    else if (msg.imageMessage) {
      await handleImageMessage(sock, from, user.id, message);
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    await sock.sendMessage(from, {
      text: '❌ Ops! Algo deu errado. Tente novamente.',
    });
  }
}

async function handleTextMessage(sock: WASocket, from: string, userId: string, text: string) {
  const lowerText = text.toLowerCase().trim();

  // Comandos especiais
  if (lowerText === 'saldo' || lowerText === '/saldo') {
    const balance = await getBalance(userId);
    await sock.sendMessage(from, {
      text: `💰 *Seu saldo atual:* R$ ${balance.toFixed(2)}`,
    });
    return;
  }

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
      report += `• ${cat}: R$ ${amount.toFixed(2)}\n`;
    });

    if (stats) {
      report += `\n🎮 *Gamificação*\n`;
      report += `⭐ Nível: ${stats.level}\n`;
      report += `🔥 Streak: ${stats.streak} dias\n`;
      report += `🏆 Conquistas: ${stats.achievements}\n`;
    }

    await sock.sendMessage(from, { text: report });
    return;
  }

  if (lowerText === 'ajuda' || lowerText === '/ajuda' || lowerText === 'oi' || lowerText === 'olá') {
    const help = `👋 *Olá! Sou seu assistente financeiro FinancaIA!*

📱 *Como usar:*
• Envie mensagens como: "Gastei 50 reais em pizza"
• Envie áudios descrevendo seus gastos
• Envie fotos de notas fiscais

💬 *Comandos:*
• *saldo* - Ver saldo atual
• *resumo* - Relatório do mês
• *ajuda* - Ver esta mensagem

🎮 Ganhe XP e conquistas registrando suas finanças!`;

    await sock.sendMessage(from, { text: help });
    return;
  }

  // Processar como transação com IA
  const transactionData = await parseTransaction(text);
  
  if (!transactionData) {
    await sock.sendMessage(from, {
      text: '🤔 Não entendi. Tente algo como: "Gastei 50 reais em pizza" ou digite *ajuda*',
    });
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

  await sock.sendMessage(from, { text: response });
}

async function handleAudioMessage(sock: WASocket, from: string, userId: string, message: WAMessage) {
  await sock.sendMessage(from, { text: '🎤 Processando áudio...' });

  const buffer = await downloadMediaMessage(message, 'buffer', {});
  const transcription = await transcribeAudio(buffer as Buffer);

  if (!transcription) {
    await sock.sendMessage(from, { text: '❌ Não consegui entender o áudio.' });
    return;
  }

  // Processar transcrição como texto
  await handleTextMessage(sock, from, userId, transcription);
}

async function handleImageMessage(sock: WASocket, from: string, userId: string, message: WAMessage) {
  await sock.sendMessage(from, { text: '🖼️ Analisando nota fiscal...' });

  const buffer = await downloadMediaMessage(message, 'buffer', {});
  const transactionData = await analyzeReceipt(buffer as Buffer);

  if (!transactionData) {
    await sock.sendMessage(from, { text: '❌ Não consegui ler a nota. Tente uma foto mais clara.' });
    return;
  }

  const { transaction, xpGained } = await addTransaction(
    userId,
    transactionData.amount,
    transactionData.type,
    transactionData.category,
    transactionData.description
  );

  let response = `📸 *Nota fiscal processada!*\n\n`;
  response += `Valor: R$ ${transactionData.amount.toFixed(2)}\n`;
  response += `Local: ${transactionData.description}\n`;
  response += `Categoria: ${transactionData.category}\n`;
  response += `\n🎮 +${xpGained} XP`;

  const achievements = await checkAchievements(userId);
  if (achievements.length > 0) {
    response += '\n\n' + achievements.join('\n');
  }

  await sock.sendMessage(from, { text: response });
}
