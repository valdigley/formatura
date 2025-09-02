# 🔧 Solução de Problemas - VPS Deploy

## Problema: Não consegue fazer login na VPS

### Causa Mais Comum: Chave Supabase Inválida

O erro de login geralmente acontece quando a `VITE_SUPABASE_ANON_KEY` está:
- Truncada/incompleta
- Corrompida durante a cópia
- Com caracteres especiais mal formatados

### ✅ Como Corrigir:

1. **Acesse o painel do Supabase:**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto: `iisejjtimakkwjrbmzvj`
   - Vá em Settings → API

2. **Copie a chave correta:**
   - Procure por "anon public"
   - Copie a chave COMPLETA (geralmente tem ~200+ caracteres)
   - A chave deve começar com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.`

3. **Atualize o .env na VPS:**
   ```bash
   cd /opt/foto-formatura
   nano .env
   ```
   
   Substitua a linha:
   ```
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_COMPLETA_AQUI
   ```

4. **Rebuild e restart:**
   ```bash
   # Com Docker:
   docker-compose down
   docker-compose up -d --build
   
   # Sem Docker:
   npm run build
   pm2 restart foto-formatura
   ```

### 🔍 Como Verificar se a Chave está Correta:

Uma chave JWT válida tem 3 partes separadas por pontos:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc2VqanRpbWFra3dqcmJtenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNDI4NzEsImV4cCI6MjA1MDkxODg3MX0.ASSINATURA_COMPLETA_AQUI
```

### 🚨 Outros Problemas Possíveis:

#### 1. URL do Supabase Incorreta
Verifique se a URL está correta:
```
VITE_SUPABASE_URL=https://iisejjtimakkwjrbmzvj.supabase.co
```

#### 2. Problemas de CORS
Se o erro for de CORS, verifique:
- Se a URL da VPS está nas configurações do Supabase
- Se o domínio está autorizado

#### 3. Problemas de Build
```bash
# Limpar e rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### 4. Verificar Logs
```bash
# Docker
docker-compose logs -f app

# PM2
pm2 logs foto-formatura

# Browser Console
# Abra F12 no navegador e veja erros no console
```

### 📞 Teste Rápido:

Execute este comando na VPS para testar a conexão:
```bash
curl -X POST https://iisejjtimakkwjrbmzvj.supabase.co/rest/v1/rpc/ping \
  -H "apikey: SUA_CHAVE_ANONIMA" \
  -H "Content-Type: application/json"
```

Se retornar erro 401, a chave está incorreta.
Se retornar 404 ou outro erro, a chave está correta.

### 🔑 Passos para Pegar a Chave Correta:

1. Acesse: https://supabase.com/dashboard/project/iisejjtimakkwjrbmzvj/settings/api
2. Copie a chave "anon public" COMPLETA
3. Cole no .env da VPS
4. Restart a aplicação

Isso deve resolver o problema de login!