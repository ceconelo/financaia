#!/bin/bash

echo "🧹 Limpando dados de autenticação antigos..."

# Para o processo se estiver rodando
echo "1. Parando processo do bot (se estiver rodando)..."
pkill -f "ts-node src/index.ts" 2>/dev/null || true

# Remove auth_info
echo "2. Removendo pasta auth_info..."
cd /mnt/nvme1n1/samples/financaia/backend
rm -rf auth_info

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📝 Agora execute:"
echo "   cd /mnt/nvme1n1/samples/financaia/backend"
echo "   npm run dev"
echo ""
