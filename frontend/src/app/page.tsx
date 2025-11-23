import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Zap, BarChart3 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FinancaIA
          </h1>
          <p className="text-2xl text-muted-foreground mb-8">
            Controle financeiro inteligente via WhatsApp
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Um assistente financeiro com IA que ajuda brasileiros a controlar seus gastos,
            melhorar sua educação financeira e alcançar seus objetivos - tudo pelo WhatsApp.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8">
                Ver Dashboard
              </Button>
            </Link>
            <Link href="/connection">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Conectar WhatsApp
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Funcionalidades</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <MessageSquare className="h-12 w-12 mb-4 text-blue-600" />
              <CardTitle>100% WhatsApp</CardTitle>
              <CardDescription>
                Registre gastos por texto, áudio ou foto de nota fiscal. Sem apps extras.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 mb-4 text-purple-600" />
              <CardTitle>Inteligência Artificial</CardTitle>
              <CardDescription>
                IA Gemini processa linguagem natural, transcreve áudios e lê notas fiscais.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 mb-4 text-green-600" />
              <CardTitle>Gamificação</CardTitle>
              <CardDescription>
                Sistema de XP, níveis, conquistas e streaks para tornar o controle divertido.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* How it Works */}
      <div className="container mx-auto px-4 py-20 bg-white/50 rounded-3xl">
        <h2 className="text-3xl font-bold text-center mb-12">Como Funciona</h2>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              1
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Conecte seu WhatsApp</h3>
              <p className="text-muted-foreground">
                Escaneie o QR code na página de conexão para vincular o bot ao seu WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              2
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Envie seus gastos</h3>
              <p className="text-muted-foreground">
                Mande mensagens como &quot;Gastei 50 reais em pizza&quot; ou envie foto da nota fiscal.
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
              3
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Acompanhe no dashboard</h3>
              <p className="text-muted-foreground">
                Visualize estatísticas, gráficos e relatórios detalhados em tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
