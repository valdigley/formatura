#!/bin/bash

# Script completo para atualizar o sistema na VPS
# Execute este script na VPS: ./update-system.sh

set -e

echo "🔄 Atualizando Sistema de Gestão de Sessões Fotográficas..."
echo "📅 $(date)"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório do projeto!"
    echo "   cd /opt/foto-formatura"
    exit 1
fi

# Fazer backup das configurações
echo "💾 Fazendo backup das configurações..."
cp .env .env.backup 2>/dev/null || echo "⚠️  Arquivo .env não encontrado"

# Verificar se há mudanças locais
if [ -d ".git" ]; then
    echo "📋 Verificando mudanças locais..."
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "⚠️  Há mudanças não commitadas. Fazendo stash..."
        git stash push -m "Backup antes da atualização $(date)" 2>/dev/null || echo "Sem mudanças para fazer stash"
    fi
    
    echo "⬇️  Baixando atualizações do GitHub..."
    git fetch origin 2>/dev/null || echo "⚠️  Não foi possível fazer fetch do Git"
    git pull origin main 2>/dev/null || echo "⚠️  Não foi possível fazer pull do Git"
    
    # Restaurar .env
    if [ -f ".env.backup" ]; then
        echo "🔧 Restaurando configurações..."
        cp .env.backup .env
    fi
fi

echo "📦 Limpando cache e atualizando dependências..."
npm cache clean --force 2>/dev/null || echo "Cache já limpo"
npm install

echo "🏗️  Fazendo build otimizado..."
rm -rf dist
npm run build

# Verificar se build foi criado
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Erro no build! Tentando novamente..."
    npm run build
    if [ ! -d "dist" ]; then
        echo "❌ Build falhou completamente!"
        exit 1
    fi
fi

echo "⏹️  Parando aplicação atual..."
pm2 stop foto-formatura 2>/dev/null || echo "Aplicação não estava rodando"
pm2 delete foto-formatura 2>/dev/null || echo "Aplicação não estava no PM2"

echo "📦 Verificando dependências globais..."
if ! command -v serve &> /dev/null; then
    echo "Instalando serve globalmente..."
    npm install -g serve
fi

echo "▶️  Iniciando aplicação atualizada..."
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 5

echo "🔍 Status da aplicação:"
pm2 status

echo ""
echo "🌐 Testando conectividade..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Aplicação funcionando! HTTP Status: $HTTP_CODE"
else
    echo "❌ Problema na aplicação! HTTP Status: $HTTP_CODE"
    echo "📋 Últimos logs:"
    pm2 logs foto-formatura --lines 5
fi

# Configurar subdomínio se não estiver configurado
if [ ! -f "/etc/nginx/sites-available/formatura.fotografo.site" ]; then
    echo "🌐 Configurando Nginx para subdomínio..."
    sudo tee /etc/nginx/sites-available/formatura.fotografo.site > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name formatura.fotografo.site;
    root /opt/foto-formatura/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/xml image/svg+xml;

    # Security
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
}
NGINXEOF

    # Ativar site
    sudo ln -sf /etc/nginx/sites-available/formatura.fotografo.site /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✅ Nginx configurado para formatura.fotografo.site"
fi

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "🌐 ACESSOS DISPONÍVEIS:"
echo "- Direto: http://147.93.182.205:8080"
echo "- Subdomínio: http://formatura.fotografo.site (após configurar DNS)"
echo ""
echo "📋 CONFIGURAR DNS:"
echo "No painel do fotografo.site, adicione:"
echo "- Tipo: A"
echo "- Nome: formatura"
echo "- Valor: 147.93.182.205"
echo "- TTL: 300"
echo ""
echo "🔒 APÓS DNS PROPAGAR (5-30 min), configure SSL:"
echo "sudo apt install -y certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d formatura.fotografo.site"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver logs: pm2 logs foto-formatura"
echo "- Reiniciar: pm2 restart foto-formatura"
echo "- Testar DNS: nslookup formatura.fotografo.site"