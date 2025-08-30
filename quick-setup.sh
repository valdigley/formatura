#!/bin/bash

# Setup rápido - execute este comando na VPS
# Vai fazer tudo automaticamente

echo "🚀 Setup rápido do Sistema de Gestão de Sessões Fotográficas..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório do projeto!"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verificar Nginx
if ! command -v nginx &> /dev/null; then
    echo "🌐 Instalando Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Criar .env se não existir
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env..."
    cat > .env << 'EOF'
VITE_SUPABASE_URL=https://xjqjqjqjqjqjqjqjqj.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
EOF
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações do Supabase!"
    echo "   nano .env"
    echo "   Depois execute novamente: ./quick-setup.sh"
    exit 1
fi

# Verificar se .env foi editado
if grep -q "sua-chave-anonima-aqui" .env; then
    echo "⚠️  Por favor, edite o arquivo .env com suas configurações reais do Supabase!"
    echo "   nano .env"
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🏗️  Fazendo build..."
npm run build

echo "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/foto-formatura > /dev/null << EOF
server {
    listen 80;
    server_name _;
    root $(pwd)/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/foto-formatura /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Configurar firewall
echo "🔒 Configurando firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ Setup concluído!"
echo ""
echo "🌐 Sua aplicação está disponível em:"
echo "   http://$(curl -s ifconfig.me)"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Teste a aplicação no navegador"
echo "2. Configure SSL se tiver domínio:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d seu-dominio.com"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Atualizar: git pull && npm run build && sudo systemctl reload nginx"
echo "- Ver logs: sudo tail -f /var/log/nginx/error.log"
echo "- Reiniciar Nginx: sudo systemctl restart nginx"