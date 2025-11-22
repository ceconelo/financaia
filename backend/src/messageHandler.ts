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
  // Normalizar texto para remover acentos
  const normalizedText = lowerText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

  if (normalizedText.startsWith('ajuda') || normalizedText.startsWith('/ajuda')) {
    const parts = normalizedText.split(' ');
    const topic = parts[1];

    if (!topic) {
      const menu = `❓ *Central de Ajuda FinancaIA*

Escolha um tópico para ver os comandos:

💰 */ajuda financas*
_Saldo, Resumo, Transações_

👨‍👩‍👧‍👦 */ajuda familia*
_Criar grupo, Entrar, Relatórios_

🎯 */ajuda planejamento*
_Criar metas, Editar, Acompanhar_

⚙️ */ajuda outros*
_Configurar nome, Gamificação_`;
      await reply(menu);
      return;
    }

    if (topic === 'financas') {
      await reply(`💰 *Ajuda: Finanças*

• *saldo*
  _Ver seu saldo atual._
• *resumo*
  _Ver relatório de gastos do mês._
• *"Gastei 50 em pizza"*
  _Registrar gastos com linguagem natural._
• *Enviar foto/áudio*
  _Registrar gastos automaticamente._`);
      return;
    }

    if (topic === 'familia') {
      await reply(`👨‍👩‍👧‍👦 *Ajuda: Família*

• *familia*
  _Ver painel da família (gastos por membro/categoria)._
• */familia criar*
  _Criar um novo grupo familiar._
• */familia entrar [código]*
  _Entrar em um grupo existente._`);
      return;
    }

    if (topic === 'planejamento') {
      await reply(`🎯 *Ajuda: Planejamento*

• */planejamento criar [Cat] [Valor]*
  _Criar meta (Ex: /planejamento criar Lazer 500)_
• */planejamento editar [Cat] [Valor]*
  _Alterar valor da meta._
• */planejamento renomear [Cat] [Novo]*
  _Renomear categoria da meta._
• */planejamento aprovar [ID]*
  _Aprovar sugestão (apenas Admin)._`);
      return;
    }

    if (topic === 'outros') {
      await reply(`⚙️ *Ajuda: Outros*

• */nome [Seu Nome]*
  _Alterar como seu nome aparece na família._
• *Gamificação*
  _Você ganha XP a cada registro!_`);
      return;
    }
    
    await reply('❌ Tópico não encontrado. Digite */ajuda* para ver o menu.');
    return;
  }

  // Comando de Nome
  if (normalizedText.startsWith('/nome') || normalizedText.startsWith('nome')) {
    const parts = text.split(' '); // Usar texto original para preservar case do nome
    const newName = parts.slice(1).join(' ').trim();

    if (!newName) {
      await reply('⚠️ Use: `/nome [Seu Nome]` para alterar como você aparece na família.');
      return;
    }

    const { updateUserName } = await import('./services/finance.js');
    await updateUserName(userId, newName);
    await reply(`✅ Nome atualizado para: *${newName}*`);
    return;
  }

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
      msg += `🔑 Código: \`${report.inviteCode}\`\n`;
      msg += `👥 ${report.memberCount} Membros\n\n`;
      msg += `💸 *Total Mês: R$ ${report.total!.toFixed(2)}*\n`;
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
    return;
  }

  // Comandos de Planejamento
  if (normalizedText.startsWith('/planejamento') || normalizedText.startsWith('planejamento')) {
    const parts = text.split(' ');
    const action = parts[1]?.toLowerCase();
    const { createPlan, getPlans, approvePlan } = await import('./services/planning.js');

    if (action === 'criar') {
      // /planejamento criar [categoria] [valor]
      const category = parts[2];
      const valueStr = parts[3];

      if (!category || !valueStr) {
        await reply('⚠️ Use: `/planejamento criar [Categoria] [Valor]`\nEx: `/planejamento criar Alimentação 500` ou `/planejamento criar Lazer 10%`');
        return;
      }

      let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
      let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

      if (valueStr.includes('%')) {
        type = 'PERCENTAGE';
      }

      if (isNaN(amount)) {
        await reply('❌ Valor inválido.');
        return;
      }

      try {
        const result = await createPlan(userId, category, type, amount);
        if (result.isPending) {
          await reply(`📝 *Sugestão enviada!* O administrador da família precisa aprovar este plano.`);
        } else {
          await reply(`✅ *Plano criado!* Meta de ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount} para ${category}.`);
        }
      } catch (e) {
        await reply('❌ Erro ao criar plano.');
      }
      return;
    }

    if (action === 'aprovar') {
      const planId = parts[2];
      if (!planId) return;
      const result = await approvePlan(userId, planId, true);
      if (result.error) await reply(`❌ ${result.error}`);
      else await reply('✅ Plano aprovado!');
      return;
    }

    if (action === 'editar') {
      // /planejamento editar [Categoria] [Novo Valor]
      const category = parts[2];
      const valueStr = parts[3];

      if (!category || !valueStr) {
        await reply('⚠️ Use: `/planejamento editar [Categoria] [Novo Valor]`');
        return;
      }

      let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
      let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

      if (valueStr.includes('%')) type = 'PERCENTAGE';
      if (isNaN(amount)) {
        await reply('❌ Valor inválido.');
        return;
      }

      const { updatePlan } = await import('./services/planning.js');
      const result = await updatePlan(userId, category, amount, undefined, type);

      if (result.error) await reply(`❌ ${result.error}`);
      else await reply(`✅ Plano de *${category}* atualizado para ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount}!`);
      return;
    }

    if (action === 'renomear') {
      // /planejamento renomear [Categoria Atual] [Novo Nome]
      const currentCategory = parts[2];
      const newCategory = parts[3];

      if (!currentCategory || !newCategory) {
        await reply('⚠️ Use: `/planejamento renomear [Categoria Atual] [Novo Nome]`');
        return;
      }

      const { updatePlan } = await import('./services/planning.js');
      const result = await updatePlan(userId, currentCategory, undefined, newCategory);

      if (result.error) await reply(`❌ ${result.error}`);
      else await reply(`✅ Categoria renomeada de *${currentCategory}* para *${newCategory}*!`);
      return;
    }

    // Listar planos
    const { activePlans, pendingPlans } = await getPlans(userId);
    let msg = `🎯 *Planejamento Financeiro*\n\n`;

    if (activePlans.length === 0 && pendingPlans.length === 0) {
      msg += 'Nenhum plano ativo.\nUse `/planejamento criar [Categoria] [Valor]` para começar.';
    } else {
      if (activePlans.length > 0) {
        msg += `*Metas Ativas:*\n`;
        activePlans.forEach((p: any) => {
          msg += `• ${p.category}: ${p.type === 'PERCENTAGE' ? p.amount + '%' : 'R$ ' + p.amount.toFixed(2)}\n`;
        });
      }

      if (pendingPlans.length > 0) {
        msg += `\n⏳ *Pendentes de Aprovação:*\n`;
        pendingPlans.forEach((p: any) => {
          msg += `• ${p.category} (${p.user.name || 'Membro'}): ${p.type === 'PERCENTAGE' ? p.amount + '%' : 'R$ ' + p.amount.toFixed(2)}\n`;
          msg += `  _Aprovar:_ \`/planejamento aprovar ${p.id}\`\n`;
        });
      }
    }
    
    await reply(msg);
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
