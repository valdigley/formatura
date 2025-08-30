#!/bin/bash

echo "🔍 Verificando conexão com Supabase..."

# Testar conectividade com Supabase
echo "1. Testando conectividade com Supabase:"
curl -I https://iisejjtimakkwjrbmzvj.supabase.co/rest/v1/ || echo "❌ Não consegue conectar com Supabase"

echo ""
echo "2. Verificando DNS:"
nslookup iisejjtimakkwjrbmzvj.supabase.co || echo "❌ Problema de DNS"

echo ""
echo "3. Verificando arquivo .env na aplicação:"
if [ -f "dist/assets/index-*.js" ]; then
    echo "✅ Arquivos JS encontrados no build"
    # Verificar se as variáveis estão no build
    grep -l "supabase" dist/assets/*.js || echo "⚠️  Variáveis Supabase não encontradas no build"
else
    echo "❌ Arquivos JS não encontrados no build"
fi

echo ""
echo "4. Testando aplicação localmente:"
curl -s http://localhost:8080 | head -20

echo ""
echo "5. Verificando se .env está sendo lido:"
cat .env

echo ""
echo "6. Verificando se o build incluiu as variáveis:"
if [ -f "dist/index.html" ]; then
    echo "✅ index.html existe"
    head -10 dist/index.html
else
    echo "❌ index.html não encontrado"
fi