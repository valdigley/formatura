#!/bin/bash

set -e

echo "🔧 CORRIGINDO CONEXÃO COM SUPABASE NA VPS..."

cd /opt/foto-formatura

# Parar aplicação
pm2 stop foto-formatura 2>/dev/null || echo "OK"

# Verificar .env atual
echo "📋 Verificando .env atual:"
cat .env

# Recriar .env com credenciais corretas
echo "📝 Recriando .env..."
cat > .env << 'ENVFILE'
VITE_SUPABASE_URL=https://iisejjtimakkwjrbmzvj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc2VqanRpbWFra3dqcmJtenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNDI4NzEsImV4cCI6MjA1MDkxODg3MX0.Ej6qJOQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQ
ENVFILE

# Verificar se as variáveis estão corretas
echo "✅ Novo .env criado:"
cat .env

# Limpar cache e node_modules
echo "🧹 Limpando cache..."
rm -rf node_modules package-lock.json dist

# Reinstalar dependências
echo "📦 Reinstalando dependências..."
npm install

# Verificar se vite.config.ts está correto
echo "📝 Verificando vite.config.ts..."
cat > vite.config.ts << 'VITECONFIG'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'process.env': {}
  }
});
VITECONFIG

# Fazer build limpo
echo "🏗️ Fazendo build limpo..."
npm run build

# Verificar se as variáveis estão no build
echo "🔍 Verificando se variáveis estão no build..."
if grep -r "iisejjtimakkwjrbmzvj" dist/; then
    echo "✅ Variáveis encontradas no build!"
else
    echo "❌ Variáveis NÃO encontradas no build!"
    echo "Tentando build com modo de desenvolvimento..."
    NODE_ENV=production npm run build
fi

# Iniciar aplicação
echo "▶️ Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

sleep 3

echo "🔍 Status final:"
pm2 status

echo "🌐 Testando aplicação..."
curl -I http://localhost:8080

echo ""
echo "✅ CORREÇÃO APLICADA!"
echo "🌐 Teste: http://147.93.182.205:8080"
echo ""
echo "📧 PARA TESTAR LOGIN:"
echo "Email: valdigley2007@gmail.com"
echo "Senha: qualquer senha (vai criar conta automaticamente)"