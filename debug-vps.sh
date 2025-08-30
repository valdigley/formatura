#!/bin/bash

echo "🔍 Diagnosticando problemas na VPS..."

echo "1. Verificando arquivo .env:"
if [ -f ".env" ]; then
    echo "✅ Arquivo .env existe"
    echo "Conteúdo (sem mostrar chaves):"
    grep -v "KEY\|TOKEN" .env || echo "Arquivo vazio ou sem variáveis"
else
    echo "❌ Arquivo .env não encontrado!"
fi

echo ""
echo "2. Verificando build:"
if [ -d "dist" ]; then
    echo "✅ Pasta dist existe"
    ls -la dist/
else
    echo "❌ Pasta dist não encontrada!"
fi

echo ""
echo "3. Verificando PM2:"
pm2 status

echo ""
echo "4. Verificando logs da aplicação:"
pm2 logs foto-formatura --lines 10

echo ""
echo "5. Testando conectividade:"
curl -I http://localhost:8080

echo ""
echo "6. Verificando porta 8080:"
sudo netstat -tlnp | grep 8080

echo ""
echo "7. Verificando se serve está instalado:"
which serve || echo "serve não encontrado"
serve --version || echo "serve não funciona"