#!/bin/bash

# Script de atualização rápida
# Para usar quando você fizer mudanças pequenas

set -e

echo "⚡ Atualização rápida do sistema..."

# Verificar diretório
if [ ! -f "package.json" ]; then
    echo "❌ Execute no diretório do projeto!"
    exit 1
fi

# Parar aplicação
echo "⏹️  Parando aplicação..."
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"

# Build rápido
echo "🏗️  Fazendo build..."
npm run build

# Iniciar aplicação
echo "▶️  Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Testar
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
echo "🌐 Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Atualização concluída com sucesso!"
    echo "🌐 Acesse: http://147.93.182.205:8080"
else
    echo "❌ Problema na aplicação!"
    pm2 logs foto-formatura --lines 5
fi