#!/bin/bash

# Script para verificar se o DNS está propagado

echo "🔍 Verificando propagação do DNS para formatura.fotografo.site..."

echo "1. Testando resolução DNS local:"
nslookup formatura.fotografo.site || echo "❌ DNS ainda não propagado localmente"

echo ""
echo "2. Testando resolução DNS externa:"
dig @8.8.8.8 formatura.fotografo.site A || echo "❌ DNS ainda não propagado no Google DNS"

echo ""
echo "3. Testando conectividade HTTP:"
curl -I http://formatura.fotografo.site 2>/dev/null && echo "✅ HTTP funcionando" || echo "❌ HTTP ainda não acessível"

echo ""
echo "4. Verificando configuração do Nginx:"
sudo nginx -t

echo ""
echo "5. Status dos sites ativos:"
sudo ls -la /etc/nginx/sites-enabled/

echo ""
echo "📋 INTERPRETAÇÃO DOS RESULTADOS:"
echo "- Se DNS resolver para 147.93.182.205 = ✅ DNS configurado"
echo "- Se HTTP retornar 200 = ✅ Site funcionando"
echo "- Se der erro = ⏳ Aguarde mais alguns minutos"
echo ""
echo "🌐 TESTE MANUAL:"
echo "- Acesse: http://formatura.fotografo.site"
echo "- Se funcionar, configure SSL: sudo certbot --nginx -d formatura.fotografo.site"