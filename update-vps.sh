#!/bin/bash

# Script para atualizar aplicação na VPS
# Execute este script na sua VPS para atualizar com a nova versão

set -e

echo "🔄 Atualizando Sistema de Gestão de Sessões Fotográficas..."

PROJECT_DIR="/opt/foto-formatura"
BACKUP_DIR="/opt/backups/foto-formatura"
DATE=$(date +%Y%m%d_%H%M%S)

# Verificar se o diretório do projeto existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Diretório do projeto não encontrado: $PROJECT_DIR"
    echo "Execute o deploy inicial primeiro com ./deploy.sh"
    exit 1
fi

cd $PROJECT_DIR

echo "💾 Criando backup antes da atualização..."
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_before_update_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=logs \
    .

echo "📥 Preparando nova versão..."
# Se você estiver usando Git:
# git pull origin main

# Se você estiver enviando arquivos manualmente:
echo "📁 Certifique-se de que os novos arquivos foram copiados para $PROJECT_DIR"

# Verificar se .env existe e tem as configurações necessárias
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

# Carregar variáveis do .env
source .env

if [[ -z "$VITE_SUPABASE_URL" || "$VITE_SUPABASE_URL" == "https://seu-projeto.supabase.co" ]]; then
    echo "❌ Configure o VITE_SUPABASE_URL no arquivo .env!"
    exit 1
fi

echo "📦 Atualizando dependências..."
if command -v node &> /dev/null; then
    npm install
    echo "🏗️  Fazendo novo build..."
    npm run build
else
    echo "📦 Node.js não encontrado. Build será feito no Docker."
fi

echo "🐳 Atualizando containers Docker..."
docker-compose down

# Limpar imagens antigas para economizar espaço
echo "🧹 Limpando imagens Docker antigas..."
docker image prune -f

# Subir novos containers
docker-compose up -d --build

# Aguardar containers iniciarem
echo "⏳ Aguardando containers iniciarem..."
sleep 15

echo "🔍 Verificando status dos containers..."
docker-compose ps

# Verificar se a aplicação está funcionando
echo "🌐 Testando aplicação atualizada..."
sleep 5

if curl -f http://localhost/health &>/dev/null; then
    echo "✅ Aplicação atualizada está respondendo!"
elif curl -f http://localhost/ &>/dev/null; then
    echo "✅ Aplicação atualizada está funcionando!"
else
    echo "⚠️  Aplicação pode não estar respondendo. Verificando logs..."
    docker-compose logs --tail=30
    echo ""
    echo "🔙 Se houver problemas, execute o rollback:"
    echo "   docker-compose down"
    echo "   tar -xzf $BACKUP_DIR/backup_before_update_$DATE.tar.gz"
    echo "   docker-compose up -d --build"
fi

echo "🧹 Limpando arquivos antigos..."
# Manter apenas últimos 5 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -type f | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true

echo ""
echo "✅ Atualização concluída com sucesso!"
echo ""
echo "📋 VERIFICAÇÕES RECOMENDADAS:"
echo "1. Acesse: http://$(curl -s ifconfig.me || echo 'seu-ip')"
echo "2. Teste o login no sistema"
echo "3. Verifique se o WhatsApp está conectado"
echo "4. Teste o envio de contratos"
echo "5. Verifique se o Mercado Pago está funcionando"
echo ""
echo "📊 LOGS ÚTEIS:"
echo "- Logs da aplicação: docker-compose logs -f app"
echo "- Logs do nginx: docker-compose logs -f nginx"
echo "- Status dos containers: docker-compose ps"
echo ""
echo "🔙 ROLLBACK (se necessário):"
echo "docker-compose down"
echo "tar -xzf $BACKUP_DIR/backup_before_update_$DATE.tar.gz"
echo "docker-compose up -d --build"