import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { processUserMessage } from '../messageHandler.js';
import { getOrCreateUser } from './finance.js';
import { updateStreak } from './gamification.js';
import { handlePlanningCallbacks, handlePlanningWizard, getPlanningMenu } from '../commands/planning.command.js';
import { handleVoiceMessage, handlePhotoMessage } from '../commands/media.command.js';

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

    // Callback Queries (Delegated to Planning Command)
    this.bot.on('callback_query', async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        const userIdentifier = `tg_${userId}`;
        const user = await getOrCreateUser(userIdentifier);

        const handled = await handlePlanningCallbacks(ctx, user);
        if (!handled) {
          await ctx.answerCbQuery('Comando desconhecido.');
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

        // 1. Wizard Flow (Delegated)
        const wizardHandled = await handlePlanningWizard(ctx, user, text);
        if (wizardHandled) return;

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

        // 2. Planning Menu (Delegated)
        if (text === '/planejamento' || text.toLowerCase() === 'planejamento') {
          const { msg, markup } = await getPlanningMenu(user.id);
          await ctx.replyWithMarkdown(msg, markup);
          return;
        }

        // 3. General Message Processing
        await processUserMessage(user.id, text, async (response) => {
          await ctx.replyWithMarkdown(response, this.getMainMenu());
        });

      } catch (error) {
        console.error('Erro ao processar mensagem do Telegram:', error);
        await ctx.reply('❌ Ocorreu um erro ao processar sua mensagem.', this.getMainMenu());
      }
    });

    // Tratamento de áudio (Delegated)
    this.bot.on(message('voice'), async (ctx) => {
      await handleVoiceMessage(ctx);
    });

    // Tratamento de imagens (Delegated)
    this.bot.on(message('photo'), async (ctx) => {
      await handlePhotoMessage(ctx);
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
