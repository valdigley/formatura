#!/bin/bash

# Script para configurar SSL após DNS estar funcionando

set -e

echo "🔒 Configurando SSL para formatura.fotografo.site..."

# Verificar se DNS está funcionando
echo "🔍 Verificando DNS..."
if ! nslookup formatura.fotografo.site | grep -q "147.93.182.205"; then
    echo "❌ DNS ainda não está propagado!"
    echo ""
    echo "📋 CONFIGURE O DNS PRIMEIRO:"
    echo "No painel do fotografo.site:"
    echo "- Tipo: A"
    echo "- Nome: formatura"
    echo "- Valor: 147.93.182.205"
    echo "- TTL: 300"
    echo ""
    echo "Aguarde 5-30 minutos e execute novamente."
    exit 1
fi

# Verificar se Certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Testar se o site está acessível via HTTP
echo "🌐 Testando acesso HTTP..."
if ! curl -s http://formatura.fotografo.site > /dev/null; then
    echo "❌ Site não está acessível via HTTP!"
    echo "Verificando configuração do Nginx..."
    sudo nginx -t
    sudo systemctl status nginx
    exit 1
fi

# Configurar SSL com Certbot
echo "🔒 Configurando certificado SSL..."
sudo certbot --nginx -d formatura.fotografo.site --non-interactive --agree-tos --email admin@fotografo.site

# Verificar se SSL foi configurado
echo "🔍 Verificando certificado SSL..."
sudo certbot certificates

# Testar HTTPS
echo "🧪 Testando HTTPS..."
sleep 5
curl -I https://formatura.fotografo.site || echo "⚠️  HTTPS pode levar alguns minutos para funcionar"

# Configurar renovação automática
echo "🔄 Configurando renovação automática..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Testar renovação
echo "🧪 Testando renovação automática..."
sudo certbot renew --dry-run

echo ""
echo "✅ SSL configurado com sucesso!"
echo ""
echo "🌐 ACESSE SUA APLICAÇÃO:"
echo "- HTTP:  http://formatura.fotografo.site"
echo "- HTTPS: https://formatura.fotografo.site"
echo ""
echo "🔒 CERTIFICADO SSL:"
echo "- Válido por 90 dias"
echo "- Renovação automática configurada"
echo "- Verificar status: sudo certbot certificates"