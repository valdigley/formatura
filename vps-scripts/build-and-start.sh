#!/bin/bash

# Parte 4: Build final e inicialização
# Execute por último

set -e

echo "🏗️ BUILD FINAL E INICIALIZAÇÃO..."

cd /opt/foto-formatura

# Fazer build final
echo "📦 Fazendo build final..."
rm -rf dist
npm run build

# Verificar build
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build falhou!"
    echo "Tentando debug..."
    npm run build
    exit 1
fi

echo "✅ Build criado com sucesso!"

# Parar aplicação anterior
echo "⏹️ Parando aplicação anterior..."
pm2 stop foto-formatura 2>/dev/null || echo "OK"
pm2 delete foto-formatura 2>/dev/null || echo "OK"

# Iniciar aplicação
echo "▶️ Iniciando aplicação..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Configurar para iniciar automaticamente
pm2 startup

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 5

# Verificar status
echo "🔍 Status da aplicação:"
pm2 status

# Testar conectividade
echo ""
echo "🌐 Testando conectividade:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
echo "Status HTTP: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "🎉 SISTEMA INSTALADO COM SUCESSO!"
    echo ""
    echo "🌐 ACESSOS:"
    echo "- Principal: http://147.93.182.205:8080"
    echo "- Local: http://localhost:8080"
    echo ""
    echo "📋 SISTEMA FUNCIONANDO:"
    echo "✅ Node.js $(node --version)"
    echo "✅ NPM $(npm --version)"
    echo "✅ PM2 configurado"
    echo "✅ Aplicação rodando na porta 8080"
    echo "✅ Build otimizado"
    echo ""
    echo "🔧 COMANDOS ÚTEIS:"
    echo "- Ver logs: pm2 logs foto-formatura"
    echo "- Reiniciar: pm2 restart foto-formatura"
    echo "- Status: pm2 status"
    echo "- Parar: pm2 stop foto-formatura"
    echo ""
    echo "🚀 PRÓXIMOS PASSOS:"
    echo "1. Teste o acesso: http://147.93.182.205:8080"
    echo "2. Configure DNS se quiser subdomínio"
    echo "3. Configure SSL se tiver domínio"
else
    echo "❌ PROBLEMA NA APLICAÇÃO!"
    echo "HTTP Status: $HTTP_CODE"
    echo ""
    echo "📋 Logs para debug:"
    pm2 logs foto-formatura --lines 10
    echo ""
    echo "🔧 Para corrigir:"
    echo "pm2 restart foto-formatura"
fi
EOF

chmod +x build-and-start.sh
./build-and-start.sh