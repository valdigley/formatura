#!/bin/bash

# Script para atualizar apenas dependências
# Mais rápido quando só mudaram packages

set -e

echo "📦 Atualizando dependências do sistema..."

if [ ! -f "package.json" ]; then
    echo "❌ Execute no diretório do projeto!"
    exit 1
fi

echo "🔍 Verificando dependências desatualizadas..."
npm outdated || echo "Verificação concluída"

echo "📦 Atualizando dependências..."
npm update

echo "🔒 Auditando segurança..."
npm audit fix || echo "Auditoria concluída"

echo "🏗️  Fazendo rebuild..."
rm -rf dist
npm run build

echo "🔄 Reiniciando aplicação..."
pm2 restart foto-formatura

echo "✅ Dependências atualizadas!"
pm2 status