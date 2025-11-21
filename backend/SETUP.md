# FinancaIA Backend - Guia de Setup Rápido

## 1️⃣ Instalar Dependências

```bash
cd backend
npm install
```

✅ **Concluído!** (148 pacotes instalados)

## 2️⃣ Configurar Banco de Dados

### Opção A: Docker (Recomendado)

```bash
cd backend
docker-compose up -d
```

### Opção B: PostgreSQL Local

Se você já tem PostgreSQL instalado, apenas certifique-se de que está rodando na porta 5432.

## 3️⃣ Configurar Variáveis de Ambiente

```bash
cd backend
cp env-template.txt .env
```

Edite o arquivo `.env` e adicione sua chave da API Gemini:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/financaia?schema=public"
GEMINI_API_KEY="SUA-CHAVE-AQUI"
```

**Como obter a chave Gemini:**
1. Acesse: https://aistudio.google.com/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave e cole no `.env`

## 4️⃣ Criar Banco de Dados

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

## 5️⃣ Iniciar o Bot

```bash
cd backend
npm run dev
```

## 6️⃣ Conectar WhatsApp

1. Um QR Code aparecerá no terminal
2. Abra o WhatsApp no seu celular
3. Vá em: **Configurações > Aparelhos conectados > Conectar aparelho**
4. Escaneie o QR Code

✅ Pronto! Agora você pode enviar mensagens para o seu próprio número!

## 🧪 Testar

Envie uma mensagem para você mesmo:
- "Gastei 50 reais em pizza"
- "saldo"
- "resumo"
- Envie um áudio
- Envie uma foto de nota fiscal

## 🐛 Troubleshooting

### "Connection refused" no PostgreSQL
- Verifique se o Docker está rodando: `docker ps`
- Ou se o PostgreSQL local está ativo: `sudo systemctl status postgresql`

### "Invalid API key" do Gemini
- Verifique se copiou a chave corretamente no `.env`
- Teste a chave em: https://aistudio.google.com/app/prompts/new_chat

### Bot não responde
- Verifique os logs no terminal
- Certifique-se de que o WhatsApp está conectado (QR Code escaneado)
