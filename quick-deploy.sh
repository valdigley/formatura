#!/bin/bash

# Script de deploy rápido para VPS
# Use este script se você já tem Docker instalado

set -e

echo "⚡ Deploy Rápido - Sistema de Gestão de Sessões Fotográficas"

# Detectar diretório atual
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")

echo "📁 Diretório atual: $CURRENT_DIR"
echo "📦 Projeto: $PROJECT_NAME"

# Verificar se os arquivos essenciais existem
required_files=("package.json" "docker-compose.yml" "Dockerfile" "src/App.tsx")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Arquivos essenciais não encontrados:"
    printf '%s\n' "${missing_files[@]}"
    echo ""
    echo "Certifique-se de estar no diretório correto do projeto."
    exit 1
fi

# Verificar .env
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env 2>/dev/null || cat > .env << EOF
# Configurações do Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Configurações do ambiente
NODE_ENV=production
EOF
    echo "⚠️  Configure o arquivo .env com suas credenciais:"
    echo "   nano .env"
    echo ""
    read -p "Pressione Enter após configurar o .env..."
fi

# Verificar configurações
source .env
if [[ -z "$VITE_SUPABASE_URL" || "$VITE_SUPABASE_URL" == "https://seu-projeto.supabase.co" ]]; then
    echo "❌ Configure o VITE_SUPABASE_URL no arquivo .env!"
    echo "   nano .env"
    exit 1
fi

echo "✅ Configurações validadas"

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Limpar containers e imagens antigas
echo "🧹 Limpando containers antigos..."
docker container prune -f
docker image prune -f

# Build e start
echo "🏗️  Fazendo build e iniciando aplicação..."
docker-compose up -d --build

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 15

# Verificar status
echo "🔍 Verificando status..."
docker-compose ps

# Testar aplicação
echo "🌐 Testando aplicação..."
if curl -f http://localhost/health &>/dev/null; then
    echo "✅ Health check: OK"
elif curl -f http://localhost/ &>/dev/null; then
    echo "✅ Aplicação: OK"
else
    echo "⚠️  Aplicação pode não estar respondendo. Logs:"
    docker-compose logs --tail=20
fi

# Mostrar informações finais
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "IP-NAO-DETECTADO")

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo ""
echo "📋 ACESSO:"
echo "- Local: http://localhost"
echo "- Externo: http://$PUBLIC_IP"
echo "- Health: http://$PUBLIC_IP/health"
echo ""
echo "📊 MONITORAMENTO:"
echo "- Status: docker-compose ps"
echo "- Logs: docker-compose logs -f"
echo "- Reiniciar: docker-compose restart"
echo ""
echo "🔧 CONFIGURAÇÃO:"
echo "1. Acesse a aplicação e faça login"
echo "2. Configure WhatsApp nas configurações"
echo "3. Configure Mercado Pago nas configurações"
echo "4. Teste o envio de contratos"
echo ""
echo "🔒 SSL (opcional):"
echo "sudo apt install certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d seu-dominio.com"