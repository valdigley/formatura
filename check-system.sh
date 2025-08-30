#!/bin/bash

# Script para verificar status completo do sistema

echo "🔍 Verificando status completo do sistema..."
echo "📅 $(date)"
echo ""

echo "1. 📋 Status da aplicação:"
pm2 status

echo ""
echo "2. 🌐 Testando conectividade:"
echo "- Local (8080):"
curl -s -o /dev/null -w "  Status: %{http_code} | Tempo: %{time_total}s\n" http://localhost:8080

echo "- Externa (8080):"
curl -s -o /dev/null -w "  Status: %{http_code} | Tempo: %{time_total}s\n" http://147.93.182.205:8080

echo "- Subdomínio (se configurado):"
curl -s -o /dev/null -w "  Status: %{http_code} | Tempo: %{time_total}s\n" http://formatura.fotografo.site 2>/dev/null || echo "  ❌ Subdomínio não acessível"

echo ""
echo "3. 🔧 Configurações do Nginx:"
if [ -f "/etc/nginx/sites-enabled/formatura.fotografo.site" ]; then
    echo "✅ Subdomínio configurado no Nginx"
else
    echo "❌ Subdomínio não configurado no Nginx"
fi

echo ""
echo "4. 🔒 Status do SSL:"
if [ -d "/etc/letsencrypt/live/formatura.fotografo.site" ]; then
    echo "✅ Certificado SSL configurado"
    sudo certbot certificates | grep formatura.fotografo.site || echo "❌ Certificado não encontrado"
else
    echo "❌ SSL não configurado"
fi

echo ""
echo "5. 🌐 DNS do subdomínio:"
nslookup formatura.fotografo.site 2>/dev/null | grep "147.93.182.205" && echo "✅ DNS propagado" || echo "❌ DNS não propagado"

echo ""
echo "6. 📊 Uso de recursos:"
echo "- CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "- RAM: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "- Disco: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " usado)"}')"

echo ""
echo "7. 🔥 Últimos logs (5 linhas):"
pm2 logs foto-formatura --lines 5

echo ""
echo "✅ Verificação completa!"