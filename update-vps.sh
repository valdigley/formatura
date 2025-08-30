#!/bin/bash

# Script para atualizar a aplicação na VPS
# Execute este script na VPS para aplicar as últimas mudanças

set -e

echo "🔄 Atualizando Sistema de Gestão de Sessões Fotográficas na VPS..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório do projeto!"
    exit 1
fi

echo "📦 Atualizando dependências..."
npm install

echo "🏗️  Fazendo novo build..."
npm run build

echo "🔄 Reiniciando aplicação..."
# Parar aplicação atual
pm2 stop foto-formatura 2>/dev/null || true

# Verificar se serve está instalado
if ! command -v serve &> /dev/null; then
    echo "📦 Instalando serve..."
    sudo npm install -g serve
fi

# Iniciar aplicação na porta 8080
pm2 start serve --name foto-formatura -- -s dist -l 8080

# Salvar configuração
pm2 save

echo "🔍 Verificando status..."
pm2 status

echo "🌐 Testando aplicação..."
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 && echo " - ✅ Aplicação respondendo" || echo " - ❌ Aplicação não responde"

echo "✅ Atualização concluída!"
echo ""
echo "🌐 Aplicação disponível em:"
echo "   http://147.93.182.205:8080"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver logs: pm2 logs foto-formatura"
echo "- Ver status: pm2 status"
echo "- Reiniciar: pm2 restart foto-formatura"
echo "- Parar: pm2 stop foto-formatura"