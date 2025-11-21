import 'dotenv/config';
import { startWhatsAppBot } from './services/whatsapp.js';
import { startTelegramBot } from './services/telegram.js';
import { startAPIServer } from './server.js';

async function main() {
  console.log('🚀 Iniciando FinancaIA Bot...\n');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY não encontrada no .env');
    process.exit(1);
  }

  try {
    // Iniciar API Server primeiro
    startAPIServer();
    
    // Iniciar Telegram Bot
    startTelegramBot();

    // Depois iniciar WhatsApp Bot
    setTimeout(() => {
      startWhatsAppBot();
    }, 1000);
  } catch (error) {
    console.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
  }
}

main();

