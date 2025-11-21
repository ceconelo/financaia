# FinancaIA - Solução de Problemas

## Erro 405 - Connection Failure

### Problema
O bot fica em loop tentando conectar e retorna erro 405:
```
❌ Conexão fechada (código: 405)
```

### Causa
- Baileys v6.8+ migrou para ESM (ECMAScript Modules)
- Projetos usando CommonJS não são compatíveis
- Versões antigas do Baileys não funcionam com WhatsApp atual

### Solução ✅ (Já implementado)

1. **Atualizar package.json:**
```json
{
  "type": "module"
}
```

2. **Atualizar tsconfig.json:**
```json
{
  "module": "ES2022"
}
```

3. **Converter todos os imports para ESM:**
```typescript
// ❌ Antigo (CommonJS)
import { func } from './file';

// ✅ Novo (ESM)
import { func } from './file.js';
```

4. **Atualizar script dev:**
```json
{
  "dev": "node --loader ts-node/esm src/index.ts"
}
```

5. **Instalar última versão do Baileys:**
```bash
npm install @whiskeysockets/baileys@latest
```

## Outros Problemas Comuns

### QR Code não aparece

**Verifique:**
1. Terminal suporta caracteres Unicode
2. Logs não estão sendo suprimidos

**Solução:**
Remova ou ajuste o logger:
```typescript
const logger = P({ level: 'silent' }); // ou 'info' para debug
```

### "Cannot find module"

**Causa:** Esqueceu extensão `.js` nos imports ESM

**Solução:** Adicione `.js` em TODOS os imports locais:
```typescript
import { func } from './services/myService.js';
```

### Processo trava após QR code

**Causa:** WhatsApp não conseguiu conectar ou QR expirou

**Solução:**
1. Pare o processo (Ctrl+C)
2. Limpe dados: `rm -rf auth_info`
3. Reinicie: `npm run dev`
4. Escaneie rapidamente (QR expira em ~60s)

### "Prisma Client não foi gerado"

**Solução:**
```bash
npx prisma generate
```

### Banco de dados não conecta

**Verifique PostgreSQL:**
```bash
docker ps  # Deve mostrar container 'financaia-postgres'
```

**Reiniciar banco:**
```bash
docker-compose down
docker-compose up -d
```

## Comandos Úteis

```bash
# Limpar tudo e recomeçar
./clean-auth.sh
rm -rf node_modules
npm install
npx prisma generate
npm run dev

# Ver logs do PostgreSQL
docker logs financaia-postgres

# Parar todos os serviços
docker-compose down
pkill -f "node.*index.ts"
```

## Referências

- [Baileys v7 Migration](https://baileys.wiki/docs/migration/to-v7.0.0/)
- [Node.js ESM Guide](https://nodejs.org/api/esm.html)
- [TypeScript ESM](https://www.typescriptlang.org/docs/handbook/esm-node.html)
