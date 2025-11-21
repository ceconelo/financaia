import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

export interface TransactionData {
  amount: number;
  category: string;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
}

export async function parseTransaction(text: string): Promise<TransactionData | null> {
  try {
    const prompt = `Você é um assistente financeiro. Analise a seguinte mensagem e extraia os dados financeiros.
Responda APENAS com um JSON no seguinte formato:
{
  "amount": número (sem símbolo de moeda),
  "type": "INCOME" ou "EXPENSE",
  "category": "alimentação" | "transporte" | "saúde" | "lazer" | "educação" | "moradia" | "outros" | "salário" | "freelance",
  "description": "descrição breve"
}

Se não houver informação financeira, responda com: { "error": "Não identifiquei um gasto ou receita" }

Mensagem do usuário: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extrair JSON da resposta
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
    console.error('Erro ao processar com IA:', error);
    return null;
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  try {
    // Gemini suporta áudio diretamente
    const audioPart = {
      inlineData: {
        data: audioBuffer.toString('base64'),
        mimeType: 'audio/ogg; codecs=opus',
      },
    };

    const prompt = 'Transcreva este áudio em português do Brasil:';
    
    const result = await model.generateContent([prompt, audioPart]);
    const response = result.response.text();
    
    return response.trim();
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);
    return null;
  }
}

export async function analyzeReceipt(imageBuffer: Buffer): Promise<TransactionData | null> {
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

    const result = await model.generateContent([prompt, imagePart]);
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
    console.error('Erro ao analisar imagem:', error);
    return null;
  }
}
