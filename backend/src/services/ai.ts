import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ============ CONFIGURATION ============

const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

// Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ============ CONSTANTS & PROMPTS ============

export interface TransactionData {
  amount: number;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
}

const CATEGORIES = {
  'aluguel': 'Pagamento de aluguel residencial.',
  'condomínio': 'Taxa de condomínio.',
  'saúde': 'Farmácia, consultas, exames, plano de saúde.',
  'mercado': 'Supermercado, feira, compras de mantimentos.',
  'celular': 'Conta de celular, recarga, plano de telefone.',
  'contas residenciais': 'Energia elétrica (luz), água, gás, internet.',
  'manutenção veículo': 'Oficina, peças, consertos de carro ou moto.',
  'combustivel': 'Posto de gasolina, álcool, diesel, abastecimento.',
  'obrigações veículo': 'IPVA, licenciamento, seguro obrigatório, multas.',
  'padaria': 'Gastos em padarias, pães, lanches rápidos.',
  'galão de agua': 'Compra de água mineral em galão.',
  'manuella': 'Gastos específicos relacionados à Manuella.',
  'capoeira': 'Mensalidades ou equipamentos de capoeira.',
  'bares e restaurantes': 'Comer fora, restaurantes, bares, iFood, lanchonetes.',
  'lazer': 'Cinema, shows, passeios, entretenimento.',
  'compras': 'Vestuário, eletrônicos, presentes (geral), itens para casa.',
  'cuidados pessoais': 'Cabeleireiro, barbearia, estética, cosméticos.',
  'viagem': 'Passagens, hospedagem, gastos em viagens.',
  'presentes': 'Compra de presentes para outras pessoas.',
  'família': 'Gastos gerais de manutenção da família.',
  'filhos': 'Escola, brinquedos, roupas e outros gastos com filhos.',
  'outros gastos': 'Despesas diversas que não se encaixam nas demais.',
  'serviços': 'Assinaturas de streaming, serviços prestados, reparos domésticos.',
  'colégio': 'Mensalidade escolar, materiais didáticos, uniformes.',
  'thiago': 'Gastos específicos relacionados ao Thiago.',
  'roberta': 'Gastos específicos relacionados à Roberta.',
  'rafaella': 'Gastos específicos relacionados à Rafaella.',
  'impostos': 'IPVA (se não em obrigações), IPTU, IRPF, taxas diversas.',
  'renda': 'Salário, bônus, recebimentos, vendas, dividendos.'
};

const JSON_FORMAT = `{
  "amount": number,
  "type": "INCOME" | "EXPENSE",
  "category": "string (one of the allowed categories)",
  "description": "string"
}`;

function buildTransactionPrompt(userInput: string): string {
  const categoriesList = Object.entries(CATEGORIES)
    .map(([cat, desc]) => `- "${cat}": ${desc}`)
    .join('\n');

  return `Você é um assistente financeiro especialista em categorização de gastos brasileiros.
Analise a seguinte mensagem e extraia os dados financeiros com precisão.

CATEGORIAS PERMITIDAS (Use EXATAMENTE um destes nomes):
${categoriesList}

REGRAS:
1. Responda APENAS com um JSON válido no formato:
${JSON_FORMAT}
2. O campo "amount" deve ser um número puro (ex: 50.50), sem símbolos de moeda.
3. Se for entrada de dinheiro, type="INCOME". Se for saída, type="EXPENSE".
4. Se não identificar valor financeiro, retorne: { "error": "Não identifiquei um gasto ou receita válido" }

Mensagem do usuário: "${userInput}"`;
}

function buildReceiptPrompt(): string {
  const categoriesList = Object.entries(CATEGORIES)
    .map(([cat, desc]) => `- "${cat}": ${desc}`)
    .join('\n');

  return `Analise esta imagem de nota fiscal ou comprovante e extraia os dados.

CATEGORIAS PERMITIDAS:
${categoriesList}

Responda APENAS com JSON no formato:
${JSON_FORMAT}

Se não for possível ler, retorne erro.`;
}

// ============ HELPERS ============

function parseResponse(responseText: string): TransactionData | null {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('AI Response did not contain JSON:', responseText);
      return null;
    }

    const data = JSON.parse(jsonMatch[0]);

    if (data.error) return null;

    return {
      amount: parseFloat(data.amount),
      type: data.type,
      category: data.category?.toLowerCase() || 'outros',
      description: data.description
    };
  } catch (e) {
    console.error('Error parsing AI response:', e);
    return null;
  }
}

// ============ GEMINI IMPLEMENTATION ============

async function parseTransactionGemini(text: string): Promise<TransactionData | null> {
  try {
    const prompt = buildTransactionPrompt(text);
    const result = await geminiModel.generateContent(prompt);
    return parseResponse(result.response.text());
  } catch (error) {
    console.error('Gemini Parse Error:', error);
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
    const result = await geminiModel.generateContent(['Transcreva este áudio em português do Brasil, mantendo os valores numéricos exatos:', audioPart]);
    return result.response.text().trim();
  } catch (error) {
    console.error('Gemini Transcription Error:', error);
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
    const prompt = buildReceiptPrompt();
    const result = await geminiModel.generateContent([prompt, imagePart]);
    return parseResponse(result.response.text());
  } catch (error) {
    console.error('Gemini Receipt Error:', error);
    return null;
  }
}

// ============ OPENAI IMPLEMENTATION ============

async function parseTransactionOpenAI(text: string): Promise<TransactionData | null> {
  try {
    const prompt = buildTransactionPrompt(text);
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    return parseResponse(completion.choices[0].message.content || '');
  } catch (error) {
    console.error('OpenAI Parse Error:', error);
    return null;
  }
}

async function transcribeAudioOpenAI(audioBuffer: Buffer): Promise<string | null> {
  try {
    const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempFilePath, audioBuffer);
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'pt',
    });
    fs.unlinkSync(tempFilePath);
    return transcription.text;
  } catch (error) {
    console.error('OpenAI Transcription Error:', error);
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
          role: 'user',
          content: [
            { type: 'text', text: buildReceiptPrompt() },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Lower temperature for extraction tasks
    });
    return parseResponse(completion.choices[0].message.content || '');
  } catch (error) {
    console.error('OpenAI Receipt Error:', error);
    return null;
  }
}

// ============ PUBLIC API ============

export async function parseTransaction(text: string): Promise<TransactionData | null> {
  console.log(`🤖 AI Provider: ${AI_PROVIDER.toUpperCase()}`);
  return AI_PROVIDER === 'openai' ? parseTransactionOpenAI(text) : parseTransactionGemini(text);
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  return AI_PROVIDER === 'openai' ? transcribeAudioOpenAI(audioBuffer) : transcribeAudioGemini(audioBuffer);
}

export async function analyzeReceipt(imageBuffer: Buffer): Promise<TransactionData | null> {
  return AI_PROVIDER === 'openai' ? analyzeReceiptOpenAI(imageBuffer) : analyzeReceiptGemini(imageBuffer);
}
