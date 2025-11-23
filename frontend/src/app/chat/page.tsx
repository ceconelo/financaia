'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'success' | 'error' | 'info';
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 Olá! Sou seu assistente financeiro FinancaIA!\n\nExperimente enviar:\n• "Gastei 50 reais em pizza"\n• "saldo"\n• "resumo"',
      sender: 'bot',
      timestamp: new Date(),
      type: 'info'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll para última mensagem
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'bot',
        timestamp: new Date(),
        type: data.type
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '❌ Erro ao processar mensagem. Certifique-se de que o backend está rodando.',
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Chat de Teste</h1>
        <p className="text-muted-foreground">
          Teste o bot sem precisar do WhatsApp
        </p>
      </div>

      <Card className="flex flex-col" style={{ height: '600px' }}>
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            FinancaIA Assistant
          </CardTitle>
          <CardDescription>
            Simule conversas como se estivesse no WhatsApp
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-purple-500 text-white'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 break-words ${
                      msg.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : msg.type === 'error'
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : msg.type === 'success'
                        ? 'bg-green-50 text-green-900 border border-green-200'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-500 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem... (ex: Gastei 50 em pizza)"
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-3 flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput('Gastei 50 em pizza')}
                disabled={isLoading}
              >
                💸 Gasto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput('Recebi 3000 de salário')}
                disabled={isLoading}
              >
                💰 Receita
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput('saldo')}
                disabled={isLoading}
              >
                📊 Saldo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput('resumo')}
                disabled={isLoading}
              >
                📈 Resumo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
