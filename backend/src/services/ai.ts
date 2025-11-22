import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import 'dotenv/config';

// Configuração de provider
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

// Inicializar clientes
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface TransactionData {
  amount: number;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
}

// ============ GEMINI IMPLEMENTATION ============

async function parseTransactionGemini(text: string): Promise<TransactionData | null> {
  try {
    const prompt = `Você é um assistente financeiro. Analise a seguinte mensagem e extraia os dados financeiros.
Responda APENAS com um JSON no seguinte formato:
{
  "amount": número (sem símbolo de moeda),
  "type": "INCOME" ou "EXPENSE",
  "category": "alimentação" | "mercado" | "transporte" | "saúde" | "lazer" | "educação" | "moradia" | "outros" | "salário" | "freelance",
  "description": "descrição breve"
}

REGRAS DE CATEGORIZAÇÃO:
- "mercado": Gastos com mercado, feira, açougue e suprimentos para casa.
- "alimentação": Gastos com comer fora, fastfood, lanches, restaurante, marmita, iFood, padaria (para lanche), etc.

Se não houver informação financeira, responda com: { "error": "Não identifiquei um gasto ou receita" }

Mensagem do usuário: "${text}"`;

    const result = await geminiModel.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Resposta sem JSON:', response);
      return null;
    }

    const data = JSON.parse(jsonMatch[0]);

    if (data.error) {
      return null;
    }

    return {
      amount: parseFloat(data.amount),
      type: data.type,
      category: data.category.toLowerCase(),
      description: data.description,
    };
  } catch (error) {
    console.error('Erro ao processar com Gemini:', error);
    return null;
  }
}

async function transcribeAudioGemini(audioBuffer: Buffer): Promise<string | null> {
  try {
    const audioPart = {
      inlineData: {
        data: audioBuffer.toString('base64'),
        mimeType: 'audio/ogg; codecs=opus',
      },
    };

    const prompt = 'Transcreva este áudio em português do Brasil:';

    const result = await geminiModel.generateContent([prompt, audioPart]);
    const response = result.response.text();

    return response.trim();
  } catch (error) {
    console.error('Erro ao transcrever áudio com Gemini:', error);
    return null;
  }
}

async function analyzeReceiptGemini(imageBuffer: Buffer): Promise<TransactionData | null> {
  try {
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg',
      },
    };

    const prompt = `Analise esta nota fiscal ou comprovante e extraia:
- Valor total
- Categoria (alimentação, transporte, etc)
- Estabelecimento/descrição

Responda APENAS com JSON:
{
  "amount": número,
  "type": "EXPENSE",
  "category": "categoria",
  "description": "nome do estabelecimento"
}`;

    const result = await geminiModel.generateContent([prompt, imagePart]);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    return {
      amount: parseFloat(data.amount),
      type: 'EXPENSE',
      category: data.category.toLowerCase(),
      description: data.description,
    };
  } catch (error) {
    console.error('Erro ao analisar imagem com Gemini:', error);
    return null;
  }
}

// ============ OPENAI IMPLEMENTATION ============

import fs from 'fs';
import path from 'path';
import os from 'os';

// ... (existing imports)

// ...

async function parseTransactionOpenAI(text: string): Promise<TransactionData | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.1-2025-11-13', // Updated default model
      messages: [
        {
          role: 'system',
          content: `Você é um assistente financeiro. Analise mensagens e extraia dados financeiros.
Responda APENAS com JSON no formato:
{
  "amount": número,
  "type": "INCOME" ou "EXPENSE",
  "category": "alimentação" | "mercado" | "transporte" | "saúde" | "lazer" | "educação" | "moradia" | "outros" | "salário" | "freelance",
  "description": "descrição breve"
}

REGRAS DE CATEGORIZAÇÃO:
- "mercado": Gastos com mercado, feira, açougue e suprimentos para casa.
- "alimentação": Gastos com comer fora, fastfood, lanches, restaurante, marmita, iFood, padaria (para lanche), etc.

Se não houver informação financeira, responda: { "error": "Não identifiquei" }`
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) return null;

    const data = JSON.parse(responseText);

    if (data.error) {
      return null;
    }

    return {
      amount: parseFloat(data.amount),
      type: data.type,
      category: data.category.toLowerCase(),
      description: data.description,
    };
  } catch (error) {
    console.error('Erro ao processar com OpenAI:', error);
    return null;
  }
}

async function transcribeAudioOpenAI(audioBuffer: Buffer): Promise<string | null> {
  try {
    // OpenAI Whisper requer um arquivo
    const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'pt',
    });

    // Limpar arquivo temporário
    fs.unlinkSync(tempFilePath);

    return transcription.text;
  } catch (error) {
    console.error('Erro ao transcrever áudio com OpenAI:', error);
    return null;
  }
}

async function analyzeReceiptOpenAI(imageBuffer: Buffer): Promise<TransactionData | null> {
  try {
    const base64Image = imageBuffer.toString('base64');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analise notas fiscais e extraia dados. Responda APENAS com JSON:
{
  "amount": número,
  "type": "EXPENSE",
  "category": "categoria",
  "description": "estabelecimento"
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analise esta nota fiscal e extraia: valor total, categoria e estabelecimento'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) return null;

    const data = JSON.parse(responseText);

    return {
      amount: parseFloat(data.amount),
      type: 'EXPENSE',
      category: data.category.toLowerCase(),
      description: data.description,
    };
  } catch (error) {
    console.error('Erro ao analisar imagem com OpenAI:', error);
    return null;
  }
}

// ============ PUBLIC API (Auto-select provider) ============

export async function parseTransaction(text: string): Promise<TransactionData | null> {
  console.log(`🤖 Usando provider: ${AI_PROVIDER.toUpperCase()}`);

  if (AI_PROVIDER === 'openai') {
    return parseTransactionOpenAI(text);
  } else {
    return parseTransactionGemini(text);
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  if (AI_PROVIDER === 'openai') {
    return transcribeAudioOpenAI(audioBuffer);
  } else {
    return transcribeAudioGemini(audioBuffer);
  }
}

export async function analyzeReceipt(imageBuffer: Buffer): Promise<TransactionData | null> {
  if (AI_PROVIDER === 'openai') {
    return analyzeReceiptOpenAI(imageBuffer);
  } else {
    return analyzeReceiptGemini(imageBuffer);
  }
}
