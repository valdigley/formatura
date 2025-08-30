#!/bin/bash

# Script para deploy via GitHub
# Execute este script na VPS após fazer push para o GitHub

set -e

echo "🚀 Deploy via GitHub para formatura.fotografo.site..."

# Verificar se git está configurado
if [ ! -d ".git" ]; then
    echo "❌ Este diretório não é um repositório Git!"
    echo "Configure primeiro:"
    echo "git init"
    echo "git remote add origin https://github.com/seu-usuario/foto-formatura.git"
    exit 1
fi

# Fazer backup do .env
echo "💾 Fazendo backup das configurações..."
cp .env .env.backup 2>/dev/null || echo "⚠️  Arquivo .env não encontrado"

# Verificar mudanças locais
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Há mudanças não commitadas. Fazendo stash..."
    git stash push -m "Backup antes do deploy $(date)"
fi

# Puxar últimas mudanças
echo "⬇️  Baixando atualizações do GitHub..."
git fetch origin
git pull origin main

# Restaurar .env
if [ -f ".env.backup" ]; then
    echo "🔧 Restaurando configurações..."
    cp .env.backup .env
fi

# Instalar/atualizar dependências
echo "📦 Instalando dependências..."
npm install

# Build da aplicação
echo "🏗️  Fazendo build..."
npm run build

# Parar aplicação atual
echo "⏹️  Parando aplicação..."
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Aguardar inicialização
sleep 3

# Verificar status
echo "🔍 Verificando status..."
pm2 status

# Testar aplicação
echo "🌐 Testando aplicação..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Aplicação funcionando! HTTP Status: $HTTP_CODE"
else
    echo "❌ Problema na aplicação! HTTP Status: $HTTP_CODE"
    pm2 logs foto-formatura --lines 5
fi

echo ""
echo "✅ Deploy via GitHub concluído!"
echo ""
echo "🌐 ACESSOS:"
echo "- Direto: http://147.93.182.205:8080"
echo "- Subdomínio: http://formatura.fotografo.site (após DNS)"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configure DNS: formatura.fotografo.site → 147.93.182.205"
echo "2. Aguarde propagação (5-30 min)"
echo "3. Configure SSL: sudo certbot --nginx -d formatura.fotografo.site"