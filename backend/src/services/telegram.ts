import { Telegraf, Markup } from 'telegraf';
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

  private getMainMenu() {
    return Markup.keyboard([
      ['💰 Saldo', '📊 Resumo'],
      ['👨‍👩‍👧‍👦 Minha Família', '➕ Criar Família'],
      ['❓ Ajuda']
    ]).resize();
  }

  private setupListeners() {
    // Comandos de Menu
    this.bot.command(['start', 'menu'], async (ctx) => {
      await ctx.reply('👋 Olá! Use o menu abaixo para navegar:', this.getMainMenu());
    });

    // Tratamento de mensagens de texto
    this.bot.on(message('text'), async (ctx) => {
      try {
        const userId = ctx.from.id.toString();
        let text = ctx.message.text;
        
        // Mapeamento de botões para comandos
        const buttonMap: Record<string, string> = {
          '💰 Saldo': '/saldo',
          '📊 Resumo': '/resumo',
          '👨‍👩‍👧‍👦 Minha Família': '/familia',
          '➕ Criar Família': '/familia criar',
          '❓ Ajuda': '/ajuda'
        };

        if (buttonMap[text]) {
          text = buttonMap[text];
        }

        const userIdentifier = `tg_${userId}`;
        
        // Criar/buscar usuário
        const user = await getOrCreateUser(userIdentifier);
        await updateStreak(user.id);

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
