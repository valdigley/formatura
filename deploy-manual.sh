#!/bin/bash

# Script de deploy manual (sem Docker)
# Para VPS com Node.js instalado

set -e

echo "🚀 Deploy manual do Sistema de Gestão de Sessões Fotográficas..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# Verificar Nginx
if ! command -v nginx &> /dev/null; then
    echo "🌐 Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

PROJECT_DIR="/var/www/foto-formatura"
echo "📁 Configurando diretório do projeto: $PROJECT_DIR"

# Criar diretório se não existir
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

cd $PROJECT_DIR

# Verificar .env
if [ ! -f ".env" ]; then
    echo "⚠️  Criando arquivo .env..."
    cat > .env << EOF
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
EOF
    echo "📝 EDITE o arquivo .env com suas configurações: $PROJECT_DIR/.env"
    exit 1
fi

echo "📦 Instalando dependências..."
npm install --production=false

echo "🏗️  Fazendo build da aplicação..."
npm run build

echo "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/foto-formatura > /dev/null << EOF
server {
    listen 80;
    server_name _;
    root $PROJECT_DIR/dist;
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
sudo nginx -t
sudo systemctl reload nginx

echo "🔥 Configurando PM2 para servir arquivos estáticos..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'foto-formatura',
    script: 'npx',
    args: 'serve -s dist -l 3001',
    cwd: '$PROJECT_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deploy concluído!"
echo ""
echo "📋 INFORMAÇÕES:"
echo "- Aplicação disponível em: http://seu-ip"
echo "- Arquivos em: $PROJECT_DIR"
echo "- Configuração Nginx: /etc/nginx/sites-available/foto-formatura"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver logs: pm2 logs foto-formatura"
echo "- Reiniciar: pm2 restart foto-formatura"
echo "- Status: pm2 status"
echo "- Parar: pm2 stop foto-formatura"
echo ""
echo "🔒 PARA SSL (HTTPS):"
echo "sudo apt install certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d seu-dominio.com"