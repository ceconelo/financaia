import 'dotenv/config';
import { startWhatsAppBot } from './services/whatsapp.js';

async function main() {
  console.log('🚀 Iniciando FinancaIA Bot...\n');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY não encontrada no .env');
    process.exit(1);
  }

  try {
    await startWhatsAppBot();
  } catch (error) {
    console.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
  }
}

main();
