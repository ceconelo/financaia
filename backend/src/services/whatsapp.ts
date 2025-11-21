import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessage,
  proto,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { handleMessage } from '../messageHandler.js';

const logger = P({ level: 'silent' }); // Reduz logs verbosos
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    logger,
    // Configurações adicionais para melhor compatibilidade
    browser: ['FinancaIA', 'Chrome', '22.0'],
    syncFullHistory: false,
    printQRInTerminal: false,
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nComo escanear:');
      console.log('1. Abra o WhatsApp no celular');
      console.log('2. Vá em Configurações > Aparelhos conectados');
      console.log('3. Toque em "Conectar aparelho"');
      console.log('4. Aponte a câmera para o QR Code acima\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`❌ Conexão fechada (código: ${statusCode})`);
      
      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔄 Tentativa de reconexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
        
        setTimeout(() => {
          startWhatsAppBot();
        }, 3000);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('\n⚠️  Limite de reconexões atingido!');
        console.log('💡 Soluções:');
        console.log('   1. Limpe os dados: rm -rf auth_info');
        console.log('   2. Reinicie o bot: npm run dev');
        console.log('   3. Verifique sua conexão com a internet\n');
        process.exit(1);
      } else {
        console.log('🛑 Não reconectando (logout manual)');
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp com sucesso!');
      console.log('📲 Bot está pronto para receber mensagens!\n');
      reconnectAttempts = 0; // Reset counter on successful connection
    } else if (connection === 'connecting') {
      console.log('🔄 Conectando ao WhatsApp...');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];
    
    if (!message.message || message.key.fromMe) return;

    try {
      await handleMessage(sock, message);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  return sock;
}
