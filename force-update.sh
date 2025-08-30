#!/bin/bash

# Script para forçar atualização completa via GitHub
# Use este se o update normal não funcionar

set -e

echo "🔥 FORÇANDO atualização completa via GitHub..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório do projeto!"
    exit 1
fi

# Backup completo
echo "💾 Fazendo backup completo..."
cp .env .env.backup 2>/dev/null || echo "⚠️  Arquivo .env não encontrado"
cp -r node_modules node_modules.backup 2>/dev/null || echo "⚠️  node_modules não encontrado"

# Parar aplicação
echo "⏹️  Parando aplicação..."
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"
pm2 delete foto-formatura 2>/dev/null || echo "Aplicação não estava no PM2"

# Reset completo do git
echo "🔄 Reset completo do repositório..."
git fetch origin
git reset --hard origin/main
git clean -fd

# Restaurar .env
if [ -f ".env.backup" ]; then
    echo "🔧 Restaurando .env..."
    cp .env.backup .env
fi

# Limpar cache do npm
echo "🧹 Limpando cache..."
npm cache clean --force
rm -rf node_modules package-lock.json

# Reinstalar tudo
echo "📦 Reinstalando dependências..."
npm install

# Build
echo "🏗️  Build da aplicação..."
npm run build

# Verificar se serve está instalado
if ! command -v serve &> /dev/null; then
    echo "📦 Instalando serve..."
    sudo npm install -g serve
fi

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 5

# Verificar status
echo "🔍 Status final:"
pm2 status

# Testar
echo "🌐 Testando aplicação..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCESSO! Aplicação funcionando! HTTP Status: $HTTP_CODE"
    echo ""
    echo "🌐 Acesse: http://147.93.182.205:8080"
else
    echo "❌ ERRO! HTTP Status: $HTTP_CODE"
    echo "📋 Logs da aplicação:"
    pm2 logs foto-formatura --lines 10
fi

echo ""
echo "🎉 Atualização forçada concluída!"