#!/bin/bash

# Script para baixar e executar atualizações na VPS
# Execute este comando na VPS para baixar os scripts mais recentes

set -e

echo "⬇️  Baixando scripts de atualização..."

# Ir para diretório do projeto
cd /opt/foto-formatura

# Baixar scripts diretamente do projeto Bolt
echo "📥 Baixando update-system.sh..."
curl -s -o update-system.sh "https://raw.githubusercontent.com/seu-usuario/foto-formatura/main/vps-scripts/update-system.sh"

echo "📥 Baixando check-status.sh..."
curl -s -o check-status.sh "https://raw.githubusercontent.com/seu-usuario/foto-formatura/main/vps-scripts/check-status.sh"

echo "📥 Baixando setup-ssl.sh..."
curl -s -o setup-ssl.sh "https://raw.githubusercontent.com/seu-usuario/foto-formatura/main/vps-scripts/setup-ssl.sh"

echo "📥 Baixando quick-fix.sh..."
curl -s -o quick-fix.sh "https://raw.githubusercontent.com/seu-usuario/foto-formatura/main/vps-scripts/quick-fix.sh"

# Dar permissões
chmod +x *.sh

echo "✅ Scripts baixados!"
echo ""
echo "🚀 EXECUTE AGORA:"
echo "./update-system.sh    # Atualização completa"
echo "./quick-fix.sh        # Correção rápida"
echo "./check-status.sh     # Verificar status"
echo "./setup-ssl.sh        # Configurar SSL (após DNS)"