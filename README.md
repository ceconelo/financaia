# 🚀 FinancaIA

> **Seu assistente financeiro inteligente, conversacional e gamificado.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

---

## 📖 Sobre o Projeto

O **FinancaIA** é uma plataforma open-source de gestão financeira pessoal e familiar que une a simplicidade dos apps de mensagem (Telegram e WhatsApp) com o poder da Inteligência Artificial.

O objetivo é remover a fricção do registro de despesas. Em vez de abrir planilhas complexas ou apps lentos, você simplesmente envia uma mensagem de texto, áudio ou foto para o seu assistente, e ele cuida de tudo.

## 🎯 O Problema que Resolvemos

A maioria das pessoas falha no controle financeiro por **falta de disciplina** ou **complexidade das ferramentas**.
- Planilhas são chatas de preencher.
- Apps tradicionais exigem muitos cliques.
- O controle familiar é desorganizado.

O **FinancaIA** resolve isso tornando o registro de gastos tão natural quanto conversar com um amigo.

---

## ✨ Funcionalidades Principais

*   **🗣️ Registro Conversacional**: "Gastei 50 reais no mercado". A IA entende e categoriza.
*   **🎙️ Transcrição de Áudio**: Envie um áudio rápido enquanto dirige ou caminha.
*   **📸 Leitura de Notas Fiscais**: Tire foto do recibo e a IA extrai os itens e valores.
*   **👨‍👩‍👧‍👦 Grupos Familiares**: Crie um grupo, convide membros e tenha uma visão unificada das finanças da casa (com painel exclusivo para admins).
*   **📊 Dashboard Web**: Visualize gráficos, tendências e relatórios detalhados em uma interface moderna.
*   **🎮 Gamificação**: Ganhe XP, suba de nível e mantenha streaks (dias seguidos) ao registrar seus gastos.
*   **📅 Planejamento**: Defina metas de gastos por categoria e receba alertas.

---

## 🛠️ Stack Tecnológica

O projeto é dividido em dois grandes módulos:

### Backend (`/backend`)
*   **Runtime**: Node.js
*   **Linguagem**: TypeScript
*   **Framework**: Express
*   **Bots**: Telegraf (Telegram) & Baileys (WhatsApp)
*   **IA**: Google Gemini 2.0 Flash
*   **Banco de Dados**: PostgreSQL com Prisma ORM

### Frontend (`/frontend`)
*   **Framework**: Next.js 15 (App Router)
*   **Estilização**: Tailwind CSS
*   **Gráficos**: Recharts
*   **Ícones**: Lucide React

---

## 🚀 Como Usar (Instalação)

### Pré-requisitos
*   Node.js 20 ou superior
*   PostgreSQL (Local ou Docker)
*   Chave de API do Google Gemini (AI Studio)
*   Token do Bot do Telegram (via BotFather)

### Passo a Passo

1.  **Clone o repositório**
    ```bash
    git clone https://github.com/ceconelo/financaia.git
    cd financaia
    ```

2.  **Configuração do Backend**
    ```bash
    cd backend
    npm install
    
    # Configure as variáveis de ambiente
    cp .env.example .env
    # Edite o arquivo .env com suas chaves (DATABASE_URL, GEMINI_API_KEY, TELEGRAM_BOT_TOKEN)
    
    # Banco de dados
    npx prisma migrate dev --name init
    
    # Iniciar
    npm run dev
    ```

3.  **Configuração do Frontend**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

4.  **Acesse**
    *   Backend/Bot: O bot estará rodando e respondendo no Telegram.
    *   Dashboard: Acesse `http://localhost:3000`.

---

## 💡 Guia de Uso

No Telegram, interaja com o bot:

*   **Registrar Gasto**: Apenas digite! Ex: "Almoço 35 reais"
*   **Ver Saldo**: Digite `/saldo` ou use o menu.
*   **Criar Família**: `/familia criar [nome]`
*   **Dashboard**: Digite `/dashboard` para receber seu link de acesso mágico.

---

## 🤝 Como Contribuir

Quer ajudar a melhorar o FinancaIA? Ficamos felizes com sua colaboração! Siga este passo a passo:

1.  **Faça um Fork** deste repositório (botão "Fork" no canto superior direito).
2.  **Crie uma Branch** para sua feature ou correção:
    ```bash
    git checkout -b minha-feature-incrivel
    ```
3.  **Faça suas alterações** no código.
4.  **Commit** suas mudanças:
    ```bash
    git commit -m "feat: Adiciona nova funcionalidade de exportação PDF"
    ```
5.  **Push** para o seu Fork:
    ```bash
    git push origin minha-feature-incrivel
    ```
6.  **Abra um Pull Request (PR)** no repositório original descrevendo o que você fez.

### Onde posso ajudar?
*   🐛 Encontrando e corrigindo bugs.
*   🎨 Melhorando a interface do Dashboard.
*   ✨ Criando novas funcionalidades para o Bot.
*   📝 Melhorando a documentação.

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Feito com 💜 por [Thiago Oliveira]
