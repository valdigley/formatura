#!/bin/bash

# Script para atualizar aplicação via GitHub na VPS
# Execute este script na VPS para puxar as últimas mudanças

set -e

echo "🔄 Atualizando Sistema de Gestão de Sessões Fotográficas via GitHub..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório do projeto!"
    exit 1
fi

# Fazer backup do .env
echo "💾 Fazendo backup das configurações..."
cp .env .env.backup 2>/dev/null || echo "⚠️  Arquivo .env não encontrado"

# Verificar status do git
echo "📋 Status atual do repositório:"
git status

# Fazer stash das mudanças locais se houver
echo "📦 Salvando mudanças locais..."
git stash push -m "Backup antes da atualização $(date)"

# Puxar últimas mudanças
echo "⬇️  Baixando atualizações do GitHub..."
git fetch origin
git pull origin main

# Restaurar .env se existir backup
if [ -f ".env.backup" ]; then
    echo "🔧 Restaurando configurações..."
    cp .env.backup .env
fi

# Verificar se package.json mudou
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
    echo "📦 package.json foi alterado, reinstalando dependências..."
    npm install
else
    echo "📦 Verificando dependências..."
    npm install
fi

# Fazer novo build
echo "🏗️  Fazendo build da aplicação..."
npm run build

# Parar aplicação atual
echo "⏹️  Parando aplicação atual..."
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"

# Verificar se serve está instalado globalmente
if ! command -v serve &> /dev/null; then
    echo "📦 Instalando serve globalmente..."
    sudo npm install -g serve
fi

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080

# Salvar configuração PM2
pm2 save

# Verificar status
echo "🔍 Verificando status..."
sleep 3
pm2 status

# Testar aplicação
echo "🌐 Testando aplicação..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Aplicação funcionando! HTTP Status: $HTTP_CODE"
else
    echo "❌ Aplicação com problema! HTTP Status: $HTTP_CODE"
    echo "📋 Verificando logs..."
    pm2 logs foto-formatura --lines 10
fi

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "🌐 Aplicação disponível em:"
echo "   http://147.93.182.205:8080"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver logs: pm2 logs foto-formatura"
echo "- Ver status: pm2 status"
echo "- Reiniciar: pm2 restart foto-formatura"
echo "- Ver mudanças: git log --oneline -5"
echo ""
echo "📋 VERIFICAR:"
echo "- Acesse http://147.93.182.205:8080 no navegador"
echo "- Teste o login com suas credenciais"