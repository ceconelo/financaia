import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { processUserMessage } from '../messageHandler.js';
import { getOrCreateUser } from './finance.js';
import { updateStreak } from './gamification.js';

export class TelegramService {
  private bot: Telegraf;

  constructor(token: string) {
    this.bot = new Telegraf(token);
    this.setupListeners();
  }

  private setupListeners() {
    // Tratamento de mensagens de texto
    this.bot.on(message('text'), async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        const text = ctx.message.text;
        // const userName = ctx.from.first_name;

        const userIdentifier = `tg_${userId}`;
        
        // Criar/buscar usuário
        const user = await getOrCreateUser(userIdentifier);
        await updateStreak(user.id);

        await processUserMessage(user.id, text, async (response) => {
          await ctx.replyWithMarkdown(response);
        });

      } catch (error) {
        console.error('Erro ao processar mensagem do Telegram:', error);
        await ctx.reply('❌ Ocorreu um erro ao processar sua mensagem.');
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
