# FinancaIA - Controle Financeiro via WhatsApp 💰

Um assistente financeiro inteligente e gamificado que funciona 100% via WhatsApp.

## 🚀 Funcionalidades

- ✅ Registro de gastos e receitas por texto, áudio ou imagem
- 🤖 IA (Gemini) para entender linguagem natural e extrair dados de notas fiscais
- 🎮 Sistema de gamificação (XP, níveis, conquistas, streaks)
- 📊 Relatórios mensais e alertas de orçamento
- 💬 Conversacional e fácil de usar

## 📁 Estrutura do Projeto

```
financaia/
├── backend/           # Bot WhatsApp + API
│   ├── src/
│   │   ├── index.ts              # Ponto de entrada
│   │   ├── messageHandler.ts     # Lógica de processamento de mensagens
│   │   └── services/
│   │       ├── whatsapp.ts       # Integração Baileys
│   │       ├── ai.ts             # Gemini (texto, áudio, imagem)
│   │       ├── finance.ts        # Lógica financeira
│   │       └── gamification.ts   # Sistema de XP e conquistas
│   ├── prisma/
│   │   └── schema.prisma         # Schema do banco de dados
│   └── package.json
└── src/               # Frontend Next.js (futuro dashboard web)
```

## 🛠️ Setup

### Pré-requisitos

- Node.js 20+
- PostgreSQL
- Conta Google AI (para Gemini API)

### Instalação

1. **Clone o repositório**
```bash
cd /mnt/nvme1n1/samples/financaia
```

2. **Configure o backend**
```bash
cd backend
npm install
```

3. **Configure o banco de dados**

Primeiro, inicie o PostgreSQL. Você pode usar Docker:
```bash
docker run --name financaia-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=financaia -p 5432:5432 -d postgres:16
```

4. **Configure as variáveis de ambiente**

Copie o arquivo de template:
```bash
cp env-template.txt .env
```

Edite `.env` e adicione sua chave da API Gemini:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/financaia?schema=public"
GEMINI_API_KEY="sua-chave-aqui"
```

Para obter a chave do Gemini: https://aistudio.google.com/apikey

5. **Execute as migrações do banco**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

6. **Inicie o bot**
```bash
npm run dev
```

7. **Conecte seu WhatsApp**

Um QR Code será exibido no terminal. Escaneie com seu WhatsApp em:
- WhatsApp > Configurações > Aparelhos conectados > Conectar aparelho

## 💬 Como Usar

Após conectar, envie mensagens para o bot:

**Exemplos de mensagens:**
- "Gastei 50 reais em pizza"
- "Recebi 3000 de salário"
- "Paguei 120 no supermercado"
- Envie um áudio: "Gastei vinte e cinco reais no Uber"
- Envie uma foto da nota fiscal

**Comandos:**
- `saldo` - Ver saldo atual
- `resumo` - Relatório do mês
- `ajuda` - Ver ajuda

## 🎮 Gamificação

- Ganhe **10 XP** por cada transação registrada
- Suba de **nível** acumulando XP
- Mantenha seu **streak** registrando gastos diariamente
- Desbloqueie **conquistas**:
  - 🎯 Primeiro Passo
  - 🔥 Semana Completa
  - 👑 Mestre do Controle
  - 💰 Poupador

## 🏗️ Stack Tecnológica

- **Backend**: Node.js + TypeScript
- **WhatsApp**: Baileys (WhatsApp Web API)
- **IA**: Google Gemini 2.0 Flash
- **Database**: PostgreSQL + Prisma ORM
- **Frontend** (futuro): Next.js 15

## 📝 Próximos Passos

- [ ] Adicionar mais categorias personalizáveis
- [ ] Relatórios gráficos via frontend web
- [ ] Exportação de dados (CSV, PDF)
- [ ] Metas financeiras de longo prazo
- [ ] Sincronização com banco (Open Finance)

## 📄 Licença

MIT
