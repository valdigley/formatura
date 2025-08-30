#!/bin/bash

echo "🔧 Corrigindo configurações da VPS..."

# Parar aplicação
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"

# Verificar e criar .env correto
echo "📝 Configurando .env..."
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://iisejjtimakkwjrbmzvj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc2VqanRpbWFra3dqcmJtenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNDI4NzEsImV4cCI6MjA1MDkxODg3MX0.Ej6qJOQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQ
EOF

echo "✅ Arquivo .env configurado"

# Verificar se serve está instalado globalmente
echo "📦 Verificando serve..."
if ! command -v serve &> /dev/null; then
    echo "Instalando serve globalmente..."
    npm install -g serve
fi

# Fazer build limpo
echo "🏗️  Fazendo build limpo..."
rm -rf dist
npm run build

# Verificar se build foi criado
if [ ! -d "dist" ]; then
    echo "❌ Erro no build! Verificando..."
    npm run build
fi

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 delete foto-formatura 2>/dev/null || echo "Aplicação não existia no PM2"
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Aguardar inicialização
sleep 3

# Verificar status
echo "🔍 Status final:"
pm2 status

# Testar aplicação
echo "🌐 Testando aplicação..."
curl -I http://localhost:8080

echo ""
echo "✅ Correção concluída!"
echo "🌐 Acesse: http://147.93.182.205:8080"