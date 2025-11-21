# Configuração Multi-Provider de IA

O FinancaIA agora suporta **dois providers de IA**:
- **Google Gemini** (padrão)
- **OpenAI** (GPT-4, GPT-3.5)

## Como Escolher o Provider

Edite o arquivo `.env` no backend:

### Opção 1: Google Gemini (Gratuito)
```env
AI_PROVIDER="gemini"
GEMINI_API_KEY="sua-chave-gemini"
```

**Vantagens:**
- ✅ Gratuito (com limites generosos)
- ✅ Suporta áudio nativo
- ✅ Multimodal (texto + imagem + áudio)

**Obter chave:** https://aistudio.google.com/apikey

### Opção 2: OpenAI (Pago)
```env
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

**Modelos disponíveis:**
- `gpt-4o` - Mais poderoso, suporta visão
- `gpt-4o-mini` - Rápido e barato (recomendado)
- `gpt-4-turbo` - Contexto maior
- `gpt-3.5-turbo` - Mais barato

**Vantagens:**
- ✅ Mais preciso em português
- ✅ JSON mode nativo
- ✅ Whisper para áudio (em desenvolvimento)

**Obter chave:** https://platform.openai.com/api-keys

## Funcionalidades por Provider

| Funcionalidade | Gemini | OpenAI |
|---------------|--------|--------|
| Parse de texto | ✅ | ✅ |
| Transcrição de áudio | ✅ | ⚠️ (em breve) |
| Análise de imagem | ✅ | ✅ (apenas gpt-4o) |

## Custos Estimados

### Gemini
- **Gratuito** até 1500 requisições/dia
- Texto: Gratuito
- Áudio: Gratuito
- Imagem: Gratuito

### OpenAI (gpt-4o-mini)
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- **~$0.001 por transação** (muito barato)

### OpenAI (gpt-4o)
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens
- **~$0.01 por transação**

## Como Trocar

1. Edite `.env`:
```bash
AI_PROVIDER="openai"  # ou "gemini"
```

2. Reinicie o backend:
```bash
cd backend
npm run dev
```

3. Teste no chat:
```
Digite: "Gastei 100 em restaurante"
```

Você verá no console:
```
🤖 Usando provider: OPENAI
```

## Recomendações

**Use Gemini se:**
- Quer começar grátis
- Precisa processar áudios
- Volume baixo (<1500 transações/dia)

**Use OpenAI se:**
- Precisa de máxima precisão
- Tem budget para API
- Quer usar GPT-4o para visão avançada

## Troubleshooting

### "API key inválida"
- Verifique se copiou a chave corretamente
- Gemini: sem espaços, somente a chave
- OpenAI: deve começar com `sk-`

### "Provider não suportado"
- Valores válidos: `gemini` ou `openai`
- Tudo em minúsculas

### Custos inesperados
- OpenAI cobra por token
- Monitore em: https://platform.openai.com/usage
- Use `gpt-4o-mini` para economizar
