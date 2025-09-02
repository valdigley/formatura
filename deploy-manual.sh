#!/bin/bash

# Script de deploy manual (sem Docker) para VPS
# Para VPS com Node.js instalado

set -e

echo "🚀 Deploy manual do Sistema de Gestão de Sessões Fotográficas..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Node.js não está instalado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js instalado: $(node --version)"
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
    echo "✅ PM2 instalado: $(pm2 --version)"
fi

# Verificar Nginx
if ! command -v nginx &> /dev/null; then
    echo "🌐 Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
    echo "✅ Nginx instalado: $(nginx -v)"
fi

PROJECT_DIR="/var/www/foto-formatura"
echo "📁 Configurando diretório do projeto: $PROJECT_DIR"

# Criar diretório se não existir
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copiar arquivos se estivermos em outro diretório
CURRENT_DIR=$(pwd)
if [ "$CURRENT_DIR" != "$PROJECT_DIR" ]; then
    echo "📋 Copiando arquivos para $PROJECT_DIR..."
    cp -r . $PROJECT_DIR/
fi

cd $PROJECT_DIR

# Verificar .env
if [ ! -f ".env" ]; then
    echo "⚠️  Criando arquivo .env..."
    cat > .env << EOF
# Configurações do Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Configurações do ambiente
NODE_ENV=production
EOF
    echo "📝 EDITE o arquivo .env com suas configurações: $PROJECT_DIR/.env"
    echo "   nano $PROJECT_DIR/.env"
    exit 1
fi

# Verificar configurações do .env
source .env
if [[ -z "$VITE_SUPABASE_URL" || "$VITE_SUPABASE_URL" == "https://seu-projeto.supabase.co" ]]; then
    echo "❌ Configure o VITE_SUPABASE_URL no arquivo .env!"
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🏗️  Fazendo build da aplicação..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Build falhou! Diretório 'dist' não foi criado."
    exit 1
fi

echo "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/foto-formatura > /dev/null << EOF
server {
    listen 80;
    server_name _;
    root $PROJECT_DIR/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Security
    location ~ /\. {
        deny all;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Ativar site e testar configuração
sudo ln -sf /etc/nginx/sites-available/foto-formatura /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "✅ Nginx configurado e recarregado"
else
    echo "❌ Erro na configuração do Nginx"
    exit 1
fi

# Configurar PM2 (opcional, para servir arquivos estáticos com Node.js)
echo "🔥 Configurando PM2..."
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
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Criar diretório de logs
mkdir -p logs

# Instalar serve se não estiver instalado
if ! command -v serve &> /dev/null; then
    echo "📦 Instalando serve..."
    sudo npm install -g serve
fi

# Iniciar PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "🔍 Verificando se a aplicação está funcionando..."
sleep 5

if curl -f http://localhost/health &>/dev/null; then
    echo "✅ Health check passou!"
elif curl -f http://localhost/ &>/dev/null; then
    echo "✅ Aplicação está funcionando!"
else
    echo "⚠️  Verificando logs do Nginx..."
    sudo tail -n 20 /var/log/nginx/error.log
fi

echo ""
echo "✅ Deploy manual concluído!"
echo ""
echo "📋 INFORMAÇÕES:"
echo "- Aplicação: http://$(curl -s ifconfig.me || echo 'seu-ip')"
echo "- Arquivos: $PROJECT_DIR"
echo "- Configuração Nginx: /etc/nginx/sites-available/foto-formatura"
echo "- Logs PM2: pm2 logs foto-formatura"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver logs: pm2 logs foto-formatura"
echo "- Reiniciar: pm2 restart foto-formatura"
echo "- Status: pm2 status"
echo "- Parar: pm2 stop foto-formatura"
echo "- Logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "🔒 PARA SSL (HTTPS):"
echo "sudo apt install certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d seu-dominio.com"
echo ""
echo "🔥 FIREWALL (se necessário):"
echo "sudo ufw allow 80"
echo "sudo ufw allow 443"
echo "sudo ufw allow ssh"
echo "sudo ufw enable"