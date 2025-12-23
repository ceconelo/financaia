'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import QRCode from 'qrcode';
import { io } from 'socket.io-client';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';

interface ConnectionStatus {
  connected: boolean;
  phoneNumber: string | null;
  uptime: number;
  connecting?: boolean;
  isReconnecting?: boolean;
}

export default function ConnectionManager() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    phoneNumber: null,
    uptime: 0
  });

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const newSocket = io(apiUrl);

    newSocket.on('connect', () => {
      console.log('Conectado ao WebSocket');
    });

    newSocket.on('qr', async (qr: string) => {
      console.log('QR Code recebido');
      const qrDataUrl = await QRCode.toDataURL(qr, { width: 400 });
      setQrCode(qrDataUrl);
    });

    newSocket.on('connection-status', (data: ConnectionStatus) => {
      console.log('Status atualizado:', data);
      setStatus(data);
      
      if (data.connected) {
        setQrCode(null); // Limpar QR quando conectar
      }
    });

    // Buscar status inicial
    fetch(`${apiUrl}/api/connection/status`)
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error('Erro ao buscar status:', err));

    return () => {
      newSocket.close();
    };
  }, []);

  const formatUptime = (seconds: number) => {
    if (seconds === 0) return 'Acabou de conectar';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m conectado`;
    return `${minutes}m conectado`;
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Conexão WhatsApp</h1>
        <p className="text-muted-foreground">
          Gerencie a conexão do bot com o WhatsApp
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status da Conexão</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {status.connected 
                    ? 'Bot conectado e operacional' 
                    : status.connecting 
                    ? 'Conectando...' 
                    : 'Bot desconectado'}
                </p>
              </div>
              <div>
                {status.connected ? (
                  <Badge className="flex items-center gap-2 bg-green-500">
                    <Wifi className="h-4 w-4" />
                    Conectado
                  </Badge>
                ) : status.connecting ? (
                  <Badge className="flex items-center gap-2 bg-yellow-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Conectando
                  </Badge>
                ) : status.isReconnecting ? (
                  <Badge className="flex items-center gap-2 bg-orange-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Reconectando
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-2">
                    <WifiOff className="h-4 w-4" />
                    Desconectado
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {status.connected && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Número conectado</p>
                  <p className="text-2xl font-mono">
                    {status.phoneNumber || 'Carregando...'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tempo conectado</p>
                  <p className="text-lg">{formatUptime(status.uptime)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        {!status.connected && qrCode && (
          <Card>
            <CardHeader>
              <CardTitle>Escanear QR Code</CardTitle>
              <CardDescription>
                Use o WhatsApp do seu celular para escanear este código
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                <img src={qrCode} alt="QR Code" className="w-80 h-80" />
              </div>
              <div className="text-sm text-muted-foreground text-center max-w-md space-y-2">
                <p className="font-semibold">Como escanear:</p>
                <ol className="text-left list-decimal list-inside space-y-1">
                  <li>Abra o WhatsApp no celular</li>
                  <li>Vá em <span className="font-mono">Configurações → Aparelhos conectados</span></li>
                  <li>Toque em <span className="font-mono">Conectar aparelho</span></li>
                  <li>Aponte a câmera para o QR Code acima</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aguardando QR */}
        {!status.connected && !qrCode && !status.connecting && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                <p>Aguardando QR Code...</p>
                <p className="text-sm mt-2">
                  Certifique-se de que o backend está rodando
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
