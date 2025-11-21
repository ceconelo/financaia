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

export async function processUserMessage(
  userId: string,
  text: string,
  reply: (text: string) => Promise<void>
) {
  const lowerText = text.toLowerCase().trim();

  // Comandos especiais
  if (lowerText === 'saldo' || lowerText === '/saldo') {
    const balance = await getBalance(userId);
    await reply(`💰 *Seu saldo atual:* R$ ${balance.toFixed(2)}`);
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
      report += `• ${cat}: R$ ${(amount as number).toFixed(2)}\n`;
    });

    if (stats) {
      report += `\n🎮 *Gamificação*\n`;
      report += `⭐ Nível: ${stats.level}\n`;
      report += `🔥 Streak: ${stats.streak} dias\n`;
      report += `🏆 Conquistas: ${stats.achievements}\n`;
    }

    // Verificar se faz parte de família
    const { getFamilyReport } = await import('./services/family.js');
    const familyReport = await getFamilyReport(userId);
    
    if (!familyReport.error && familyReport.total !== undefined) {
      report += `\n👨‍👩‍👧‍👦 *Família: ${familyReport.familyName}*\n`;
      report += `💸 Total Familiar: R$ ${familyReport.total.toFixed(2)}\n`;
      report += `ℹ️ Digite */familia* para detalhes`;
    }

    await reply(report);
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
• *familia* - Gerenciar conta familiar
• *ajuda* - Ver esta mensagem

🎮 Ganhe XP e conquistas registrando suas finanças!`;

    await reply(help);
    return;
  }

  // Normalizar texto para remover acentos
  const normalizedText = lowerText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Comandos de Família
  if (normalizedText.startsWith('/familia') || normalizedText.startsWith('familia')) {
    const parts = normalizedText.split(' ');
    const action = parts[1];
    const { createFamilyGroup, joinFamilyGroup, getFamilyReport } = await import('./services/family.js');

    if (action === 'criar') {
      const result = await createFamilyGroup(userId);
      if (result.error) {
        await reply(`❌ ${result.error}`);
      } else {
        await reply(`🎉 *Família criada com sucesso!*\n\nCódigo de convite: *${result.familyGroup!.inviteCode}*\n\nCompartilhe este código com quem você quer adicionar à família.`);
      }
      return;
    }

    if (action === 'entrar') {
      // Pegar o código original (sem lowerCase) mas limpar brackets se houver
      let code = text.split(' ')[2] || '';
      code = code.replace(/[\[\]]/g, '').trim();
      
      if (!code) {
        await reply('⚠️ Use: `/familia entrar [codigo]`');
        return;
      }
      const result = await joinFamilyGroup(userId, code);
      if (result.error) {
        await reply(`❌ ${result.error}`);
      } else {
        await reply(`🎉 *Você entrou na família ${result.familyGroup!.name}!*`);
      }
      return;
    }

    // Relatório da família (default)
    const report = await getFamilyReport(userId);
    if (report.error) {
      await reply(`👨‍👩‍👧‍👦 *Conta Familiar*\n\nVocê ainda não faz parte de uma família.\n\n*Comandos:*\n• \`/familia criar\` - Criar nova família\n• \`/familia entrar [codigo]\` - Entrar em uma família existente`);
    } else {
      let msg = `👨‍👩‍👧‍👦 *Família: ${report.familyName}*\n`;
      msg += `🔑 Código: *${report.inviteCode}*\n`;
      msg += `👥 Membros: ${report.memberCount}\n\n`;
      msg += `💸 *Total Gasto (Mês):* R$ ${report.total!.toFixed(2)}\n\n`;
      
      msg += `*Por Membro:*\n`;
      Object.entries(report.byMember!).forEach(([name, amount]) => {
        msg += `• ${name}: R$ ${amount.toFixed(2)}\n`;
      });

      await reply(msg);
    }
    return;
  }

  // Processar como transação com IA
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

async function handleTextMessage(sock: WASocket, from: string, userId: string, text: string) {
  await processUserMessage(userId, text, async (response) => {
    await sock.sendMessage(from, { text: response });
  });
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
