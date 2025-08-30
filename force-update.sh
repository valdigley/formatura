#!/bin/bash

# Script para atualização forçada completa
# Use quando houver problemas ou mudanças grandes

set -e

echo "🔥 ATUALIZAÇÃO FORÇADA do Sistema..."
echo "⚠️  Isso vai parar a aplicação temporariamente"
echo ""

if [ ! -f "package.json" ]; then
    echo "❌ Execute no diretório do projeto!"
    exit 1
fi

echo "💾 Fazendo backup completo..."
cp .env .env.backup 2>/dev/null || echo "⚠️  .env não encontrado"
cp -r node_modules node_modules.backup 2>/dev/null || echo "⚠️  node_modules não encontrado"

echo "⏹️  Parando aplicação..."
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"
pm2 delete foto-formatura 2>/dev/null || echo "Aplicação não estava no PM2"

# Reset Git se existir
if [ -d ".git" ]; then
    echo "🔄 Reset completo do Git..."
    git fetch origin 2>/dev/null || echo "Sem repositório remoto"
    git reset --hard origin/main 2>/dev/null || echo "Sem branch main remoto"
    git clean -fd 2>/dev/null || echo "Nada para limpar"
fi

# Restaurar .env
if [ -f ".env.backup" ]; then
    echo "🔧 Restaurando .env..."
    cp .env.backup .env
fi

echo "🧹 Limpando cache e reinstalando..."
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

echo "🏗️  Build completo..."
rm -rf dist
npm run build

echo "▶️  Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Aguardar e testar
echo "⏳ Aguardando inicialização..."
sleep 5

echo "🔍 Status final:"
pm2 status

echo ""
echo "🌐 Testando aplicação..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCESSO! Aplicação funcionando!"
else
    echo "❌ ERRO! HTTP Status: $HTTP_CODE"
    echo "📋 Logs:"
    pm2 logs foto-formatura --lines 10
fi

echo ""
echo "🎉 Atualização forçada concluída!"
echo ""
echo "🌐 ACESSOS:"
echo "- Direto: http://147.93.182.205:8080"
echo "- Subdomínio: http://formatura.fotografo.site"
echo ""
echo "🔒 PARA SSL:"
echo "sudo certbot --nginx -d formatura.fotografo.site"