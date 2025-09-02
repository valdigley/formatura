#!/bin/bash

# Script de deploy para VPS
# Execute este script na sua VPS

set -e

echo "🚀 Iniciando deploy do Sistema de Gestão de Sessões Fotográficas..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker instalado. Você pode precisar fazer logout/login para usar docker sem sudo."
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Instalando..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado."
fi

# Criar diretório do projeto se não existir
PROJECT_DIR="/opt/foto-formatura"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 Criando diretório do projeto..."
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
fi

cd $PROJECT_DIR

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando template..."
    cat > .env << EOF
# Configurações do Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Configurações do domínio (opcional)
DOMAIN=seu-dominio.com
EMAIL=seu-email@exemplo.com
EOF
    echo "📝 Arquivo .env criado. EDITE-O com suas configurações antes de continuar!"
    echo "   Arquivo localizado em: $PROJECT_DIR/.env"
    exit 1
fi

echo "📦 Fazendo build da aplicação..."

# Verificar se node_modules existe, se não, instalar dependências
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

npm run build

echo "🐳 Iniciando containers Docker..."
docker-compose up -d --build

echo "🔍 Verificando status dos containers..."
docker-compose ps

echo "✅ Deploy concluído!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Verifique se a aplicação está rodando: http://seu-ip"
echo "2. Configure SSL com Let's Encrypt (opcional):"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d seu-dominio.com"
echo "3. Configure firewall se necessário:"
echo "   sudo ufw allow 80"
echo "   sudo ufw allow 443"
echo ""
echo "📊 MONITORAMENTO:"
echo "- Logs da aplicação: docker-compose logs -f app"
echo "- Logs do nginx: docker-compose logs -f nginx"
echo "- Status: docker-compose ps"
echo ""
echo "🔄 COMANDOS ÚTEIS:"
echo "- Parar: docker-compose down"
echo "- Reiniciar: docker-compose restart"
echo "- Atualizar: git pull && docker-compose up -d --build"