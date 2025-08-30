#!/bin/bash

# Script para verificar status completo do sistema

echo "🔍 Status do Sistema de Gestão de Sessões Fotográficas"
echo "📅 $(date)"
echo "=" | tr ' ' '=' | head -c 50; echo ""

echo "1. 📋 Status PM2:"
pm2 status

echo ""
echo "2. 🌐 Conectividade:"
echo "- Local (8080):"
curl -s -o /dev/null -w "  HTTP %{http_code} | Tempo: %{time_total}s\n" http://localhost:8080

echo "- Externa (8080):"
curl -s -o /dev/null -w "  HTTP %{http_code} | Tempo: %{time_total}s\n" http://147.93.182.205:8080

echo "- Subdomínio:"
curl -s -o /dev/null -w "  HTTP %{http_code} | Tempo: %{time_total}s\n" http://formatura.fotografo.site 2>/dev/null || echo "  ❌ Subdomínio não acessível"

echo ""
echo "3. 🔧 Configurações:"
echo "- .env existe: $([ -f ".env" ] && echo "✅" || echo "❌")"
echo "- dist existe: $([ -d "dist" ] && echo "✅" || echo "❌")"
echo "- Nginx subdomínio: $([ -f "/etc/nginx/sites-enabled/formatura.fotografo.site" ] && echo "✅" || echo "❌")"

echo ""
echo "4. 🌐 DNS:"
nslookup formatura.fotografo.site 2>/dev/null | grep "147.93.182.205" && echo "✅ DNS propagado" || echo "❌ DNS não propagado"

echo ""
echo "5. 🔒 SSL:"
if [ -d "/etc/letsencrypt/live/formatura.fotografo.site" ]; then
    echo "✅ SSL configurado"
    sudo certbot certificates | grep formatura.fotografo.site || echo "❌ Certificado com problema"
else
    echo "❌ SSL não configurado"
fi

echo ""
echo "6. 📊 Recursos do servidor:"
echo "- CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "- RAM: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "- Disco: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " usado)"}')"

echo ""
echo "7. 🔥 Últimos logs (3 linhas):"
pm2 logs foto-formatura --lines 3

echo ""
echo "=" | tr ' ' '=' | head -c 50; echo ""
echo "✅ Verificação completa!"