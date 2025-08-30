#!/bin/bash

# Script de deploy simples sem Docker
# Para VPS com recursos limitados

set -e

echo "🚀 Deploy simples do Sistema de Gestão de Sessões Fotográficas..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verificar Nginx
if ! command -v nginx &> /dev/null; then
    echo "🌐 Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Criando arquivo .env..."
    cat > .env << EOF
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
EOF
    echo "📝 EDITE o arquivo .env com suas configurações: $(pwd)/.env"
    echo "Depois execute novamente: ./deploy-simple.sh"
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🏗️  Fazendo build da aplicação..."
npm run build

echo "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/foto-formatura > /dev/null << EOF
server {
    listen 80;
    server_name _;
    root $(pwd)/dist;
    index index.html;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/foto-formatura /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Deploy concluído!"
echo ""
echo "📋 INFORMAÇÕES:"
echo "- Aplicação disponível em: http://$(curl -s ifconfig.me)"
echo "- Arquivos em: $(pwd)"
echo "- Configuração Nginx: /etc/nginx/sites-available/foto-formatura"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo "- Reiniciar Nginx: sudo systemctl restart nginx"
echo "- Atualizar app: git pull && npm run build && sudo systemctl reload nginx"