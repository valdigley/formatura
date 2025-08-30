#!/bin/bash

# Deploy em porta específica para não conflitar com outras aplicações
# Este script configura a aplicação na porta 8080

set -e

echo "🚀 Deploy do Sistema de Gestão de Sessões Fotográficas na porta 8080..."

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

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# Criar .env se não existir
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env..."
    cat > .env << 'ENVEOF'
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
ENVEOF
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações do Supabase!"
    echo "   nano .env"
    echo "   Depois execute novamente: ./deploy-port-specific.sh"
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

echo "🔧 Configurando PM2 para servir na porta 8080..."
cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'foto-formatura',
    script: 'npx',
    args: 'serve -s dist -l 8080',
    cwd: process.cwd(),
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
EOFPM2

# Criar diretório de logs
mkdir -p logs

# Parar aplicação se estiver rodando
pm2 stop foto-formatura 2>/dev/null || true
pm2 delete foto-formatura 2>/dev/null || true

# Instalar serve se não estiver instalado
npm install -g serve

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Configurar PM2 para iniciar automaticamente
pm2 startup

# Configurar firewall para porta 8080
echo "🔒 Configurando firewall para porta 8080..."
sudo ufw allow 8080

echo "✅ Deploy concluído!"
echo ""
echo "🌐 Sua aplicação está disponível em:"
echo "   http://$(curl -s ifconfig.me):8080"
echo "   http://147.93.182.205:8080"
echo ""
echo "📋 INFORMAÇÕES:"
echo "- Porta utilizada: 8080"
echo "- Não interfere com outras aplicações na porta 80"
echo "- Gerenciado pelo PM2"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver status: pm2 status"
echo "- Ver logs: pm2 logs foto-formatura"
echo "- Reiniciar: pm2 restart foto-formatura"
echo "- Parar: pm2 stop foto-formatura"
echo "- Atualizar: git pull && npm run build && pm2 restart foto-formatura"
echo ""
echo "🔍 VERIFICAR SE ESTÁ FUNCIONANDO:"
echo "curl http://localhost:8080"