#!/bin/bash

# Script de verificação do ambiente FinancaIA

echo "🔍 Verificando ambiente FinancaIA..."
echo ""

# 1. Verificar Node.js
echo "1️⃣ Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js instalado: $NODE_VERSION"
else
    echo "   ❌ Node.js não encontrado"
    exit 1
fi

# 2. Verificar npm
echo ""
echo "2️⃣ Verificando npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✅ npm instalado: $NPM_VERSION"
else
    echo "   ❌ npm não encontrado"
    exit 1
fi

# 3. Verificar Docker (opcional)
echo ""
echo "3️⃣ Verificando Docker (opcional)..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker -v)
    echo "   ✅ Docker instalado: $DOCKER_VERSION"
else
    echo "   ⚠️  Docker não encontrado (opcional)"
fi

# 4. Verificar PostgreSQL
echo ""
echo "4️⃣ Verificando PostgreSQL..."
if nc -z localhost 5432 2>/dev/null; then
    echo "   ✅ PostgreSQL rodando na porta 5432"
else
    echo "   ⚠️  PostgreSQL não detectado na porta 5432"
    echo "   💡 Execute: docker-compose up -d"
fi

# 5. Verificar .env
echo ""
echo "5️⃣ Verificando arquivo .env..."
if [ -f "backend/.env" ]; then
    echo "   ✅ Arquivo .env existe"
    
    if grep -q "GEMINI_API_KEY=" backend/.env; then
        if grep -q "GEMINI_API_KEY=\"your-gemini-api-key-here\"" backend/.env; then
            echo "   ⚠️  GEMINI_API_KEY ainda não configurada"
        else
            echo "   ✅ GEMINI_API_KEY configurada"
        fi
    else
        echo "   ❌ GEMINI_API_KEY não encontrada no .env"
    fi
else
    echo "   ❌ Arquivo .env não encontrado"
    echo "   💡 Execute: cp backend/env-template.txt backend/.env"
fi

# 6. Verificar node_modules
echo ""
echo "6️⃣ Verificando dependências..."
if [ -d "backend/node_modules" ]; then
    echo "   ✅ node_modules existe"
else
    echo "   ❌ node_modules não encontrado"
    echo "   💡 Execute: cd backend && npm install"
fi

# 7. Verificar Prisma
echo ""
echo "7️⃣ Verificando Prisma..."
if [ -d "backend/node_modules/.prisma" ]; then
    echo "   ✅ Prisma client gerado"
else
    echo "   ⚠️  Prisma client não gerado"
    echo "   💡 Execute: cd backend && npx prisma generate"
fi

echo ""
echo "✅ Verificação completa!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Configure o .env com sua chave Gemini"
echo "   2. Inicie o PostgreSQL: cd backend && docker-compose up -d"
echo "   3. Rode as migrations: cd backend && npx prisma migrate dev"
echo "   4. Inicie o bot: cd backend && npm run dev"
