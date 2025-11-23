# FinancaIA Dashboard - Guia de Uso

## 🚀 Iniciar os Serviços

### 1. Backend (Bot WhatsApp + API)
```bash
cd backend
npm run dev
```

Isso irá iniciar:
- 🤖 Bot WhatsApp (Baileys)
- 🌐 API REST (porta 4000)
- 🔌 WebSocket Server

### 2. Frontend (Dashboard Next.js)
Em outro terminal:
```bash
cd /mnt/nvme1n1/samples/financaia
npm run dev
```

Acesse: **http://localhost:3000**

## 📱 Páginas do Dashboard

### Home (`/`)
- Landing page com visão geral do projeto
- Links para Dashboard e Conexão

### Dashboard (`/dashboard`)
- **Cards de Estatísticas**:
  - Total de usuários (ativos vs total)
  - Transações hoje/semana/mês
  - Top categoria do mês
  
- **Gráfico de Linha**:
  - Receitas vs Despesas (últimos 7 dias)
  
- **Top 5 Categorias**:
  - Ranking de gastos por categoria

### Conexão WhatsApp (`/connection`)
- **Status em Tempo Real**:
  - Badge verde (conectado) / vermelho (desconectado)
  - Número de telefone conectado
  - Tempo de conexão
  
- **QR Code**:
  - Aparece automaticamente quando não conectado
  - Atualiza em tempo real via WebSocket
  - Instruções de como escanear

## 🔌 Como Funciona

### Backend → Frontend

1. **Backend emite eventos via WebSocket**:
   - `qr` - Novo QR code disponível
   - `connection-status` - Mudança no status da conexão
   - `new-transaction` - Nova transação (futuro)

2. **Frontend consome APIs REST**:
   - `GET /api/stats` - Estatísticas gerais
   - `GET /api/connection/status` - Status da conexão
   - `GET /api/users` - Lista de usuários
   - `GET /api/transactions/chart` - Dados para gráficos

### Fluxo de Conexão

1. Usuário acessa `/connection`
2. Frontend conecta ao WebSocket (porta 4000)
3. Backend emite QR code via WebSocket
4. Frontend exibe QR code em tempo real
5. Usuário escaneia com WhatsApp
6. Backend emite `connection-status` com `connected: true`
7. Frontend atualiza UI mostrando status conectado

## 🎨 Tecnologias Usadas

### Frontend
- **Next.js 15** - Framework React
- **shadcn/ui** - Componentes UI modernos
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos
- **Socket.io Client** - WebSocket
- **qrcode** - Geração de QR code

### Backend
- **Express** - API REST
- **Socket.io** - WebSocket server
- **Prisma** - ORM
- **Baileys** - WhatsApp Bot

## 🐛 Troubleshooting

### "Failed to fetch" no Dashboard

**Problema**: Frontend não consegue conectar ao backend

**Solução**:
1. Verifique se o backend está rodando: `ps aux | grep "node.*index.ts"`
2. Verifique se a porta 4000 está livre: `lsof -i :4000`
3. Certifique-se de que o CORS está configurado corretamente

### QR Code não aparece

**Problema**: WebSocket não está conectando

**Solução**:
1. Abra o console do navegador (F12)
2. Verifique erros de conexão WebSocket
3. Confirme que o backend está rodando
4. Tente recarregar a página

### Gráficos não aparecem

**Problema**: Sem dados ou erro na API

**Solução**:
1. Verifique se há transações no banco: `npx prisma studio`
2. Abra a API diretamente: `http://localhost:4000/api/stats`
3. Verifique console do navegador

## 📊 Dados de Teste

Se quiser adicionar dados de teste via Prisma Studio:

```bash
cd backend
npx prisma studio
```

Acesse: http://localhost:5555

## 🔄 Desenvolvimento

### Hot Reload
Ambos frontend e backend têm hot reload:
- **Frontend**: Mudanças em `/src` recarregam automaticamente
- **Backend**: Reinicie manualmente após mudanças em `/backend/src`

### Portas
- **Frontend**: 3000
- **Backend API**: 4000
- **Prisma Studio**: 5555
- **PostgreSQL**: 5432
