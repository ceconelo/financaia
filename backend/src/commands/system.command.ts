import { checkAccess, validateKey } from '../services/auth.js';
import { updateUserName, prisma } from '../services/finance.js';

export const handleAuthFlow = async (
    userId: string,
    text: string,
    reply: (text: string) => Promise<void>
): Promise<boolean> => {
    const isAuthorized = await checkAccess(userId);

    if (isAuthorized) return false; // Continue to other commands

    // Tentar validar se o texto é uma chave
    if (text.length > 4 && text.length < 20 && !text.includes(' ') && !text.includes('@')) {
        const result = await validateKey(userId, text.trim().toUpperCase());
        if (result.success) {
            await reply('🎉 *Acesso Liberado!* Bem-vindo ao FinancaIA.\n\nUse */ajuda* para começar.');
            return true;
        }
    }

    // Tentar validar se é um email (para fila de espera)
    if (text.includes('@') && text.includes('.')) {
        const email = text.trim().toLowerCase();
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { email }
            });
            await reply('✅ *Você está na fila de espera!* \n\nAssim que liberarmos seu acesso, você receberá um aviso aqui.');
        } catch (e) {
            await reply('❌ Erro ao salvar email. Tente novamente.');
        }
        return true;
    }

    // Menu de Bloqueio
    await reply(`🔒 *Acesso Restrito*\n\nO FinancaIA é exclusivo para convidados.\n\n1️⃣ Se você tem uma chave, envie ela agora.\n2️⃣ Se não tem, envie seu *EMAIL* para entrar na fila de espera.`);
    return true;
};

export const handleSystemCommands = async (
    userId: string,
    text: string,
    reply: (text: string) => Promise<void>
): Promise<boolean> => {
    const lowerText = text.toLowerCase().trim();
    const normalizedText = lowerText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Ajuda
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
            return true;
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
            return true;
        }

        if (topic === 'familia') {
            await reply(`👨‍👩‍👧‍👦 *Ajuda: Família*

• *familia*
  _Ver painel da família (gastos por membro/categoria)._
• */familia criar*
  _Criar um novo grupo familiar._
• */familia entrar [código]*
  _Entrar em um grupo existente._`);
            return true;
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
            return true;
        }

        if (topic === 'outros') {
            await reply(`⚙️ *Ajuda: Outros*

• */nome [Seu Nome]*
  _Alterar como seu nome aparece na família._
• *Gamificação*
  _Você ganha XP a cada registro!_`);
            return true;
        }

        await reply('❌ Tópico não encontrado. Digite */ajuda* para ver o menu.');
        return true;
    }

    // Comando de Nome
    if (normalizedText.startsWith('/nome') || normalizedText.startsWith('nome')) {
        const parts = text.split(' '); // Usar texto original para preservar case do nome
        const newName = parts.slice(1).join(' ').trim();

        if (!newName) {
            await reply('⚠️ Use: `/nome [Seu Nome]` para alterar como você aparece na família.');
            return true;
        }

        await updateUserName(userId, newName);
        await reply(`✅ Nome atualizado para: *${newName}*`);
        return true;
    }

    return false;
};
