#!/bin/bash

# Script de deploy para VPS - Sistema de Gestão de Sessões Fotográficas
# Execute este script na sua VPS para fazer o deploy inicial

set -e

echo "🚀 Iniciando deploy do Sistema de Gestão de Sessões Fotográficas..."

# Verificar se está executando como root ou com sudo
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  Executando como root. Recomendamos usar um usuário não-root."
fi

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "📦 Docker não está instalado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    
    # Adicionar usuário atual ao grupo docker se não for root
    if [[ $EUID -ne 0 ]]; then
        sudo usermod -aG docker $USER
        echo "✅ Docker instalado. Faça logout/login para usar docker sem sudo."
        echo "   Ou execute: newgrp docker"
    fi
    
    rm get-docker.sh
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Docker Compose não está instalado. Instalando..."
    
    # Detectar arquitetura
    ARCH=$(uname -m)
    if [[ $ARCH == "x86_64" ]]; then
        ARCH="x86_64"
    elif [[ $ARCH == "aarch64" ]]; then
        ARCH="aarch64"
    else
        echo "❌ Arquitetura não suportada: $ARCH"
        exit 1
    fi
    
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$ARCH" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado."
fi

# Definir diretório do projeto
PROJECT_DIR="/opt/foto-formatura"
echo "📁 Configurando projeto em: $PROJECT_DIR"

# Criar diretório do projeto se não existir
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 Criando diretório do projeto..."
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
fi

# Copiar arquivos para o diretório do projeto se estivermos em outro local
CURRENT_DIR=$(pwd)
if [ "$CURRENT_DIR" != "$PROJECT_DIR" ]; then
    echo "📋 Copiando arquivos para $PROJECT_DIR..."
    sudo cp -r . $PROJECT_DIR/
    sudo chown -R $USER:$USER $PROJECT_DIR
fi

cd $PROJECT_DIR

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando template..."
    cat > .env << EOF
# Configurações do Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Configurações do ambiente
NODE_ENV=production

# Configurações do domínio (opcional)
DOMAIN=seu-dominio.com
EMAIL=seu-email@exemplo.com
EOF
    echo "📝 Arquivo .env criado. EDITE-O com suas configurações antes de continuar!"
    echo "   Arquivo localizado em: $PROJECT_DIR/.env"
    echo ""
    echo "🔧 Para editar: nano $PROJECT_DIR/.env"
    echo ""
    echo "⚠️  IMPORTANTE: Configure o .env antes de continuar!"
    exit 1
fi

# Verificar se as variáveis essenciais estão configuradas
source .env
if [[ -z "$VITE_SUPABASE_URL" || "$VITE_SUPABASE_URL" == "https://seu-projeto.supabase.co" ]]; then
    echo "❌ Configure o VITE_SUPABASE_URL no arquivo .env primeiro!"
    echo "   Edite: nano $PROJECT_DIR/.env"
    exit 1
fi

if [[ -z "$VITE_SUPABASE_ANON_KEY" || "$VITE_SUPABASE_ANON_KEY" == "sua-chave-anonima" ]]; then
    echo "❌ Configure o VITE_SUPABASE_ANON_KEY no arquivo .env primeiro!"
    echo "   Edite: nano $PROJECT_DIR/.env"
    exit 1
fi

echo "✅ Configurações do .env validadas"

# Parar containers existentes se houver
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Verificar se node_modules existe, se não, instalar dependências
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    
    # Verificar se Node.js está instalado para build local
    if command -v node &> /dev/null; then
        npm install
        echo "🏗️  Fazendo build da aplicação..."
        npm run build
    else
        echo "📦 Node.js não encontrado localmente. Build será feito no Docker."
    fi
else
    echo "📦 Dependências já instaladas. Fazendo build..."
    if command -v node &> /dev/null; then
        npm run build
    fi
fi

# Criar diretórios necessários
mkdir -p logs
mkdir -p /opt/backups/foto-formatura

echo "🐳 Iniciando containers Docker..."
docker-compose up -d --build

# Aguardar containers iniciarem
echo "⏳ Aguardando containers iniciarem..."
sleep 10

echo "🔍 Verificando status dos containers..."
docker-compose ps

# Verificar se a aplicação está respondendo
echo "🌐 Testando aplicação..."
sleep 5

if curl -f http://localhost/health &>/dev/null; then
    echo "✅ Aplicação está respondendo!"
elif curl -f http://localhost/ &>/dev/null; then
    echo "✅ Aplicação está funcionando!"
else
    echo "⚠️  Aplicação pode não estar respondendo ainda. Verificando logs..."
    docker-compose logs --tail=20
fi

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📋 INFORMAÇÕES DO DEPLOY:"
echo "- Aplicação: http://$(curl -s ifconfig.me || echo 'seu-ip')"
echo "- Diretório: $PROJECT_DIR"
echo "- Logs: docker-compose logs -f"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Teste a aplicação: http://$(curl -s ifconfig.me || echo 'seu-ip')"
echo "2. Configure SSL com Let's Encrypt (opcional):"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d seu-dominio.com"
echo "3. Configure firewall se necessário:"
echo "   sudo ufw allow 80"
echo "   sudo ufw allow 443"
echo "   sudo ufw allow ssh"
echo ""
echo "📊 COMANDOS ÚTEIS:"
echo "- Ver logs: docker-compose logs -f"
echo "- Reiniciar: docker-compose restart"
echo "- Parar: docker-compose down"
echo "- Atualizar: ./update-vps.sh"
echo ""
echo "🔧 CONFIGURAÇÃO:"
echo "- Configure o Supabase no sistema após o primeiro login"
echo "- Configure WhatsApp e Mercado Pago nas configurações"
echo "- Teste o envio de contratos e pagamentos"