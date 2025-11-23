import { WASocket, WAMessage, downloadMediaMessage } from '@whiskeysockets/baileys';
import { transcribeAudio, analyzeReceipt } from './services/ai.js';
import { getOrCreateUser, addTransaction } from './services/finance.js';
import { checkAchievements, updateStreak } from './services/gamification.js';
import { processUserMessage } from './services/message.service.js';

// Re-export for compatibility
export { processUserMessage };

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
