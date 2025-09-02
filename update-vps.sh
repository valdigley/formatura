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
    .

echo "📥 Baixando nova versão..."
# Se você estiver usando Git:
# git pull origin main

# Se você estiver enviando arquivos manualmente, descomente as linhas abaixo:
# echo "📁 Substitua os arquivos do projeto manualmente e pressione Enter para continuar..."
# read -p "Arquivos atualizados? (y/N): " confirm
# if [[ $confirm != [yY] ]]; then
#     echo "❌ Atualização cancelada"
#     exit 1
# fi

echo "📦 Atualizando dependências..."
npm install

echo "🏗️  Fazendo novo build..."
npm run build

# Verificar se está usando Docker
if [ -f "docker-compose.yml" ]; then
    echo "🐳 Atualizando containers Docker..."
    docker-compose down
    docker-compose up -d --build
    
    echo "🔍 Verificando status dos containers..."
    docker-compose ps
    
elif command -v pm2 &> /dev/null; then
    echo "🔄 Reiniciando aplicação com PM2..."
    pm2 restart foto-formatura
    pm2 status
    
else
    echo "🌐 Recarregando Nginx..."
    sudo systemctl reload nginx
fi

echo "🧹 Limpando arquivos antigos..."
# Manter apenas últimos 5 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -type f | sort -r | tail -n +6 | xargs rm -f

echo "✅ Atualização concluída com sucesso!"
echo ""
echo "📋 VERIFICAÇÕES:"
echo "1. Acesse: http://seu-ip ou https://seu-dominio.com"
echo "2. Teste o login e funcionalidades principais"
echo "3. Verifique se os contratos estão sendo enviados"
echo ""
echo "📊 LOGS ÚTEIS:"
if [ -f "docker-compose.yml" ]; then
    echo "- Logs da aplicação: docker-compose logs -f app"
    echo "- Logs do nginx: docker-compose logs -f nginx"
else
    echo "- Logs da aplicação: pm2 logs foto-formatura"
    echo "- Logs do sistema: sudo journalctl -u nginx -f"
fi
echo ""
echo "🔙 ROLLBACK (se necessário):"
echo "tar -xzf $BACKUP_DIR/backup_before_update_$DATE.tar.gz"
echo "npm run build && pm2 restart foto-formatura"