import { transcribeAudio, analyzeReceipt } from '../services/ai.js';
import { addTransaction } from '../services/finance.js';
import { checkAchievements, updateStreak } from '../services/gamification.js';
import { processUserMessage } from '../messageHandler.js';
import { getOrCreateUser } from '../services/finance.js';

export const handleVoiceMessage = async (ctx: any) => {
    try {
        const userId = ctx.from.id.toString();
        const userIdentifier = `tg_${userId}`;

        await ctx.reply('🎤 Processando áudio...');

        const fileId = ctx.message.voice.file_id;
        const fileLink = await ctx.telegram.getFileLink(fileId);

        const response = await fetch(fileLink.href);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const transcription = await transcribeAudio(buffer);

        if (!transcription) {
            await ctx.reply('❌ Não consegui entender o áudio.');
            return;
        }

        const user = await getOrCreateUser(userIdentifier);
        await updateStreak(user.id);

        await processUserMessage(user.id, transcription, async (response) => {
            await ctx.replyWithMarkdown(response);
        });

    } catch (error) {
        console.error('Erro ao processar áudio:', error);
        await ctx.reply('❌ Erro ao processar áudio.');
    }
};

export const handlePhotoMessage = async (ctx: any) => {
    try {
        const userId = ctx.from.id.toString();
        const userIdentifier = `tg_${userId}`;

        await ctx.reply('🖼️ Analisando nota fiscal...');

        const photos = ctx.message.photo;
        const fileId = photos[photos.length - 1].file_id;
        const fileLink = await ctx.telegram.getFileLink(fileId);

        const response = await fetch(fileLink.href);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const transactionData = await analyzeReceipt(buffer);

        if (!transactionData) {
            await ctx.reply('❌ Não consegui ler a nota. Tente uma foto mais clara.');
            return;
        }

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
        console.error('Erro ao processar imagem:', error);
        await ctx.reply('❌ Erro ao processar imagem.');
    }
};
