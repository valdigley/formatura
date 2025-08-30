#!/bin/bash

# Script rápido para corrigir problemas comuns

set -e

echo "🔧 Correção rápida do sistema..."

# Ir para diretório correto
cd /opt/foto-formatura

# Verificar .env
if [ ! -f ".env" ]; then
    echo "📝 Criando .env..."
    cat > .env << 'EOF'
VITE_SUPABASE_URL=https://iisejjtimakkwjrbmzvj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc2VqanRpbWFra3dqcmJtenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNDI4NzEsImV4cCI6MjA1MDkxODg3MX0.Ej6qJOQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQ
EOF
fi

# Parar aplicação
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"

# Build limpo
echo "🏗️  Build limpo..."
rm -rf dist node_modules/.cache
npm run build

# Verificar build
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build falhou!"
    exit 1
fi

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 delete foto-formatura 2>/dev/null || echo "OK"
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

sleep 3

# Testar
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
echo "🌐 Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Sistema funcionando!"
    echo "🌐 Acesse: http://147.93.182.205:8080"
else
    echo "❌ Problema detectado!"
    pm2 logs foto-formatura --lines 5
fi