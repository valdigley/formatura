#!/bin/bash

# Script para remover completamente e reinstalar o sistema na VPS
# Execute na VPS: ./remove-and-reinstall.sh

set -e

echo "🗑️  REMOVENDO SISTEMA ANTIGO..."
echo "📅 $(date)"
echo ""

# Parar e remover aplicação do PM2
echo "⏹️  Parando aplicação..."
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"
pm2 delete foto-formatura 2>/dev/null || echo "Aplicação não estava no PM2"

# Fazer backup do .env se existir
if [ -f "/opt/foto-formatura/.env" ]; then
    echo "💾 Fazendo backup do .env..."
    cp /opt/foto-formatura/.env /tmp/foto-formatura-env-backup
    echo "✅ Backup salvo em /tmp/foto-formatura-env-backup"
fi

# Remover diretório completamente
echo "🗑️  Removendo diretório antigo..."
sudo rm -rf /opt/foto-formatura

echo ""
echo "📥 REINSTALANDO SISTEMA LIMPO..."

# Criar diretório
sudo mkdir -p /opt/foto-formatura
sudo chown $USER:$USER /opt/foto-formatura
cd /opt/foto-formatura

# Baixar código atualizado do Bolt
echo "📦 Baixando código atualizado..."
curl -L -o sistema-formatura.zip "https://bolt.new/download/sistema-formatura"

# Se não conseguir baixar do Bolt, usar método alternativo
if [ ! -f "sistema-formatura.zip" ]; then
    echo "⚠️  Download direto falhou, criando estrutura manualmente..."
    
    # Criar package.json
    cat > package.json << 'EOF'
{
  "name": "sistema-gestao-sessoes-fotograficas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.56.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^3.1.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}
EOF

    # Criar estrutura básica
    mkdir -p src/components/{auth,dashboard,students,classes,packages,sessions,settings,layout}
    mkdir -p src/{hooks,lib,types}
    mkdir -p public
    
    echo "📁 Estrutura criada, você precisará copiar os arquivos manualmente"
else
    echo "📦 Extraindo arquivos..."
    unzip -q sistema-formatura.zip
    rm sistema-formatura.zip
fi

# Restaurar .env se existir backup
if [ -f "/tmp/foto-formatura-env-backup" ]; then
    echo "🔄 Restaurando configurações..."
    cp /tmp/foto-formatura-env-backup .env
    echo "✅ Arquivo .env restaurado"
else
    echo "⚠️  Criando .env de exemplo..."
    cat > .env << 'EOF'
# Configure suas variáveis do Supabase aqui
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
EOF
    echo "❗ IMPORTANTE: Configure o arquivo .env com suas credenciais do Supabase!"
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Fazer build
echo "🏗️  Fazendo build..."
npm run build

# Verificar se build foi criado
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Erro no build!"
    echo "📋 Verifique se o arquivo .env está configurado corretamente"
    echo "📋 Verifique se todas as dependências foram instaladas"
    exit 1
fi

# Instalar serve se não estiver instalado
if ! command -v serve &> /dev/null; then
    echo "📦 Instalando serve globalmente..."
    sudo npm install -g serve
fi

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 5

# Testar aplicação
echo "🔍 Testando aplicação..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ SISTEMA REINSTALADO COM SUCESSO!"
    echo ""
    echo "🌐 ACESSOS:"
    echo "- Direto: http://147.93.182.205:8080"
    echo "- Local: http://localhost:8080"
    echo ""
    echo "📋 STATUS:"
    pm2 status
else
    echo ""
    echo "❌ PROBLEMA NA APLICAÇÃO!"
    echo "HTTP Status: $HTTP_CODE"
    echo ""
    echo "📋 Logs de erro:"
    pm2 logs foto-formatura --lines 10
    echo ""
    echo "🔧 POSSÍVEIS SOLUÇÕES:"
    echo "1. Verifique o arquivo .env"
    echo "2. Execute: npm run build"
    echo "3. Execute: pm2 restart foto-formatura"
fi

echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver logs: pm2 logs foto-formatura"
echo "- Reiniciar: pm2 restart foto-formatura"
echo "- Parar: pm2 stop foto-formatura"
echo "- Status: pm2 status"