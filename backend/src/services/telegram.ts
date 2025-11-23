import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { processUserMessage } from '../messageHandler.js';
import { getOrCreateUser } from './finance.js';
import { updateStreak } from './gamification.js';
import { sessionService } from './session.js';
import { createPlan, deletePlan, getPlans, updatePlan } from './planning.js';

export class TelegramService {
  private bot: Telegraf;

  constructor(token: string) {
    this.bot = new Telegraf(token);
    this.setupListeners();
  }

  private getMainMenu() {
    return Markup.keyboard([
      ['💰 Saldo', '📊 Resumo'],
      ['📊 Dashboard', '🎯 Planejamento'],
      ['👨‍👩‍👧‍👦 Minha Família', '➕ Criar Família'],
      ['⚙️ Configurar Nome', '❓ Ajuda']
    ]).resize();
  }

  private setupListeners() {
    // Comandos de Menu
    this.bot.command(['start', 'menu'], async (ctx) => {
      await ctx.reply('👋 Olá! Use o menu abaixo para navegar:', this.getMainMenu());
    });

    // Callback Queries (Botões Inline)
    this.bot.on('callback_query', async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        const userIdentifier = `tg_${userId}`;
        const user = await getOrCreateUser(userIdentifier);
        // @ts-ignore
        const data = ctx.callbackQuery.data;

        // --- CREATE FLOW ---
        if (data === 'plan_create') {
          sessionService.setSession(user.id, 'PLAN_CREATE_CATEGORY');
          await ctx.reply('📝 Digite a *Categoria* da nova meta (ex: Alimentação, Lazer):', { parse_mode: 'Markdown' });
          await ctx.answerCbQuery();
          return;
        }

        // --- DELETE FLOW ---
        if (data === 'plan_delete') {
          sessionService.setSession(user.id, 'PLAN_DELETE_CATEGORY');
          await ctx.reply('🗑️ Digite a *Categoria* que deseja excluir:', { parse_mode: 'Markdown' });
          await ctx.answerCbQuery();
          return;
        }

        // --- EDIT FLOW ---
        if (data === 'plan_edit') {
          sessionService.setSession(user.id, 'PLAN_EDIT_CATEGORY');
          await ctx.reply('✏️ Digite a *Categoria* que deseja alterar:', { parse_mode: 'Markdown' });
          await ctx.answerCbQuery();
          return;
        }

        if (data === 'edit_name') {
          const session = sessionService.getSession(user.id);
          if (session && session.data?.category) {
            sessionService.setSession(user.id, 'PLAN_EDIT_NEW_NAME', { category: session.data.category });
            await ctx.reply(`📝 Digite o novo *Nome* para ${session.data.category}:`, { parse_mode: 'Markdown' });
          }
          await ctx.answerCbQuery();
          return;
        }

        if (data === 'edit_value') {
          const session = sessionService.getSession(user.id);
          if (session && session.data?.category) {
            sessionService.setSession(user.id, 'PLAN_EDIT_NEW_VALUE', { category: session.data.category });
            await ctx.reply(`💰 Digite o novo *Valor* ou *Porcentagem* para ${session.data.category}:`, { parse_mode: 'Markdown' });
          }
          await ctx.answerCbQuery();
          return;
        }

      } catch (error) {
        console.error('Erro no callback:', error);
        await ctx.answerCbQuery('Erro ao processar.');
      }
    });

    // Tratamento de mensagens de texto
    this.bot.on(message('text'), async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        const userIdentifier = `tg_${userId}`;
        let text = ctx.message.text;

        // Criar/buscar usuário
        const user = await getOrCreateUser(userIdentifier);
        await updateStreak(user.id);

        // Verificar Sessão Ativa (Wizard Flow)
        const session = sessionService.getSession(user.id);

        if (session) {
          // --- CREATE STEPS ---
          if (session.state === 'PLAN_CREATE_CATEGORY') {
            sessionService.updateSessionData(user.id, { category: text });
            sessionService.setSession(user.id, 'PLAN_CREATE_AMOUNT', { category: text });
            await ctx.reply(`💰 Agora digite o *Valor* ou *Porcentagem* para ${text} (ex: 500 ou 10%):`, { parse_mode: 'Markdown' });
            return;
          }

          if (session.state === 'PLAN_CREATE_AMOUNT') {
            const category = session.data.category;
            const valueStr = text;

            let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
            let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

            if (valueStr.includes('%')) type = 'PERCENTAGE';

            if (isNaN(amount)) {
              await ctx.reply('❌ Valor inválido. Tente novamente (ex: 500 ou 10%).');
              return;
            }

            try {
              const result = await createPlan(user.id, category, type, amount);
              if (result.isPending) {
                await ctx.reply(`📝 *Sugestão enviada!* O admin precisa aprovar.`);
              } else {
                await ctx.reply(`✅ *Plano criado!* Meta de ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount} para ${category}.`);
              }
            } catch (e) {
              await ctx.reply('❌ Erro ao criar plano.');
            }

            sessionService.clearSession(user.id);
            return;
          }

          // --- DELETE STEPS ---
          if (session.state === 'PLAN_DELETE_CATEGORY') {
            const category = text;
            const result = await deletePlan(user.id, category);

            if (result.error) {
              await ctx.reply(`❌ ${result.error}`);
            } else {
              await ctx.reply(`✅ Plano de *${category}* excluído!`);
            }

            sessionService.clearSession(user.id);
            return;
          }

          // --- EDIT STEPS ---
          if (session.state === 'PLAN_EDIT_CATEGORY') {
            const category = text;
            sessionService.setSession(user.id, 'PLAN_EDIT_OPTION', { category });

            await ctx.reply(`O que deseja alterar em *${category}*?`,
              Markup.inlineKeyboard([
                [Markup.button.callback('📝 Nome', 'edit_name'), Markup.button.callback('💰 Valor', 'edit_value')]
              ])
            );
            return;
          }

          if (session.state === 'PLAN_EDIT_NEW_NAME') {
            const category = session.data.category;
            const newName = text;

            const result = await updatePlan(user.id, category, undefined, newName);

            if (result.error) {
              await ctx.reply(`❌ ${result.error}`);
            } else {
              await ctx.reply(`✅ Categoria renomeada de *${category}* para *${newName}*!`);
            }
            sessionService.clearSession(user.id);
            return;
          }

          if (session.state === 'PLAN_EDIT_NEW_VALUE') {
            const category = session.data.category;
            const valueStr = text;

            let type: 'FIXED' | 'PERCENTAGE' = 'FIXED';
            let amount = parseFloat(valueStr.replace(',', '.').replace('R$', '').replace('%', ''));

            if (valueStr.includes('%')) type = 'PERCENTAGE';

            if (isNaN(amount)) {
              await ctx.reply('❌ Valor inválido. Tente novamente.');
              return;
            }

            const result = await updatePlan(user.id, category, amount, undefined, type);

            if (result.error) {
              await ctx.reply(`❌ ${result.error}`);
            } else {
              await ctx.reply(`✅ Plano de *${category}* atualizado para ${type === 'PERCENTAGE' ? amount + '%' : 'R$ ' + amount}!`);
            }
            sessionService.clearSession(user.id);
            return;
          }
        }

        // Mapeamento de botões para comandos
        const buttonMap: Record<string, string> = {
          '💰 Saldo': '/saldo',
          '📊 Resumo': '/resumo',
          '📊 Dashboard': '/dashboard',
          '🎯 Planejamento': '/planejamento',
          '👨‍👩‍👧‍👦 Minha Família': '/familia',
          '➕ Criar Família': '/familia criar',
          '⚙️ Configurar Nome': '/nome',
          '❓ Ajuda': '/ajuda'
        };

        if (buttonMap[text]) {
          text = buttonMap[text];
        }

        // Intercept Planning Command to show Inline Menu
        if (text === '/planejamento' || text.toLowerCase() === 'planejamento') {
          const { activePlans, pendingPlans } = await getPlans(user.id);
          let msg = `🎯 *Planejamento Financeiro*\n\n`;

          if (activePlans.length === 0 && pendingPlans.length === 0) {
            msg += 'Nenhum plano ativo.\n';
          } else {
            if (activePlans.length > 0) {
              msg += `*Metas Ativas:*\n`;
              activePlans.forEach((p: any) => {
                msg += `• ${p.category}: ${p.type === 'PERCENTAGE' ? p.amount + '%' : 'R$ ' + p.amount.toFixed(2)}\n`;
              });
            }
            if (pendingPlans.length > 0) {
              msg += `\n⏳ *Pendentes:*\n`;
              pendingPlans.forEach((p: any) => {
                msg += `• ${p.category}: ${p.amount}\n`;
              });
            }
          }

          await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard([
            [Markup.button.callback('➕ Nova Meta', 'plan_create')],
            [Markup.button.callback('✏️ Editar', 'plan_edit'), Markup.button.callback('🗑️ Excluir', 'plan_delete')]
          ]));
          return;
        }

        await processUserMessage(user.id, text, async (response) => {
          await ctx.replyWithMarkdown(response, this.getMainMenu());
        });

      } catch (error) {
        console.error('Erro ao processar mensagem do Telegram:', error);
        await ctx.reply('❌ Ocorreu um erro ao processar sua mensagem.', this.getMainMenu());
      }
    });

    // Tratamento de áudio (voice)
    this.bot.on(message('voice'), async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        const userIdentifier = `tg_${userId}`;

        await ctx.reply('🎤 Processando áudio...');

        // Obter link do arquivo
        const fileId = ctx.message.voice.file_id;
        const fileLink = await ctx.telegram.getFileLink(fileId);

        // Download do arquivo
        const response = await fetch(fileLink.href);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Transcrever
        const { transcribeAudio } = await import('../services/ai.js');
        const transcription = await transcribeAudio(buffer);

        if (!transcription) {
          await ctx.reply('❌ Não consegui entender o áudio.');
          return;
        }

        // Processar como texto
        const user = await getOrCreateUser(userIdentifier);
        await updateStreak(user.id);

        await processUserMessage(user.id, transcription, async (response) => {
          await ctx.replyWithMarkdown(response);
        });

      } catch (error) {
        console.error('Erro ao processar áudio do Telegram:', error);
        await ctx.reply('❌ Erro ao processar áudio.');
      }
    });

    // Tratamento de imagens (photo)
    this.bot.on(message('photo'), async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        const userIdentifier = `tg_${userId}`;

        await ctx.reply('🖼️ Analisando nota fiscal...');

        // Pegar a maior imagem (última do array)
        const photos = ctx.message.photo;
        const fileId = photos[photos.length - 1].file_id;
        const fileLink = await ctx.telegram.getFileLink(fileId);

        // Download do arquivo
        const response = await fetch(fileLink.href);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Analisar recibo
        const { analyzeReceipt } = await import('../services/ai.js');
        const transactionData = await analyzeReceipt(buffer);

        if (!transactionData) {
          await ctx.reply('❌ Não consegui ler a nota. Tente uma foto mais clara.');
          return;
        }

        // Adicionar transação
        const { addTransaction } = await import('./finance.js');
        const { checkAchievements } = await import('./gamification.js');

        const user = await getOrCreateUser(userIdentifier);
        await updateStreak(user.id);

        const { transaction, xpGained } = await addTransaction(
          user.id,
          transactionData.amount,
          transactionData.type,
          transactionData.category,
          transactionData.description
        );

        let replyMsg = `📸 *Nota fiscal processada!*\n\n`;
        replyMsg += `Valor: R$ ${transactionData.amount.toFixed(2)}\n`;
        replyMsg += `Local: ${transactionData.description}\n`;
        replyMsg += `Categoria: ${transactionData.category}\n`;
        replyMsg += `\n🎮 +${xpGained} XP`;

        const achievements = await checkAchievements(user.id);
        if (achievements.length > 0) {
          replyMsg += '\n\n' + achievements.join('\n');
        }

        await ctx.replyWithMarkdown(replyMsg);

      } catch (error) {
        console.error('Erro ao processar imagem do Telegram:', error);
        await ctx.reply('❌ Erro ao processar imagem.');
      }
    });

    // Tratamento de erros
    this.bot.catch((err, ctx) => {
      console.error(`Erro no bot do Telegram para ${ctx.updateType}:`, err);
    });
  }

  public async start() {
    console.log('🚀 Iniciando Telegram Bot...');
    try {
      await this.bot.launch();
      console.log('✅ Telegram Bot iniciado com sucesso!');

      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      console.error('❌ Falha ao iniciar Telegram Bot:', error);
    }
  }
}

export function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN não definido. Bot do Telegram não será iniciado.');
    return;
  }

  const telegramService = new TelegramService(token);
  telegramService.start();
}
