#!/bin/bash

# Script para configurar o subdomínio formatura.fotografo.site
# Execute este script na VPS

set -e

echo "🌐 Configurando subdomínio formatura.fotografo.site..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório do projeto (/opt/foto-formatura)!"
    exit 1
fi

# Verificar se Nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Verificar se Certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "🔒 Instalando Certbot para SSL..."
    sudo apt install -y certbot python3-certbot-nginx
fi

# Copiar configuração do Nginx
echo "📝 Configurando Nginx para o subdomínio..."
sudo cp nginx-subdomain.conf /etc/nginx/sites-available/formatura.fotografo.site

# Ativar o site
sudo ln -sf /etc/nginx/sites-available/formatura.fotografo.site /etc/nginx/sites-enabled/

# Testar configuração do Nginx
echo "🔍 Testando configuração do Nginx..."
sudo nginx -t

# Recarregar Nginx
echo "🔄 Recarregando Nginx..."
sudo systemctl reload nginx

# Verificar se a aplicação está rodando
echo "📋 Verificando aplicação..."
pm2 status

# Se não estiver rodando, iniciar
if ! pm2 list | grep -q "foto-formatura.*online"; then
    echo "▶️  Iniciando aplicação..."
    pm2 start serve --name foto-formatura -- -s dist -l 8080
    pm2 save
fi

# Configurar firewall
echo "🔒 Configurando firewall..."
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080

echo ""
echo "✅ Configuração básica concluída!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🌐 CONFIGURAR DNS:"
echo "   No painel do seu provedor de domínio (fotografo.site):"
echo "   - Adicione um registro A para 'formatura'"
echo "   - Aponte para: 147.93.182.205"
echo "   - TTL: 300 (5 minutos)"
echo ""
echo "2. ⏳ AGUARDAR PROPAGAÇÃO DNS (5-30 minutos)"
echo ""
echo "3. 🔒 CONFIGURAR SSL (após DNS propagar):"
echo "   sudo certbot --nginx -d formatura.fotografo.site"
echo ""
echo "4. 🧪 TESTAR:"
echo "   http://formatura.fotografo.site (após DNS)"
echo "   https://formatura.fotografo.site (após SSL)"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Testar DNS: nslookup formatura.fotografo.site"
echo "- Ver logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo "- Reiniciar Nginx: sudo systemctl restart nginx"
echo "- Status SSL: sudo certbot certificates"