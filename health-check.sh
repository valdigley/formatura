#!/bin/bash

# Script de verificação de saúde do sistema
# Execute para verificar se tudo está funcionando

echo "🔍 Verificando saúde do Sistema de Gestão de Sessões Fotográficas..."

PROJECT_DIR="/opt/foto-formatura"

# Verificar se o diretório existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Diretório do projeto não encontrado: $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

echo ""
echo "📊 STATUS DOS SERVIÇOS:"

# Verificar Docker
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "🐳 Docker Compose:"
    docker-compose ps
    echo ""
    
    # Verificar logs recentes
    echo "📋 Logs recentes (últimas 10 linhas):"
    docker-compose logs --tail=10
    echo ""
fi

# Verificar PM2
if command -v pm2 &> /dev/null; then
    echo "🔥 PM2 Status:"
    pm2 status
    echo ""
fi

# Verificar Nginx
if command -v nginx &> /dev/null; then
    echo "🌐 Nginx Status:"
    sudo systemctl status nginx --no-pager -l
    echo ""
fi

echo "🌍 TESTES DE CONECTIVIDADE:"

# Testar aplicação local
if curl -f http://localhost/health &>/dev/null; then
    echo "✅ Health check local: OK"
elif curl -f http://localhost/ &>/dev/null; then
    echo "✅ Aplicação local: OK"
else
    echo "❌ Aplicação local: FALHA"
fi

# Testar aplicação externa
PUBLIC_IP=$(curl -s ifconfig.me || echo "IP não detectado")
echo "🌐 IP Público: $PUBLIC_IP"

if curl -f http://$PUBLIC_IP/health &>/dev/null; then
    echo "✅ Health check externo: OK"
elif curl -f http://$PUBLIC_IP/ &>/dev/null; then
    echo "✅ Aplicação externa: OK"
else
    echo "❌ Aplicação externa: FALHA (verifique firewall)"
fi

echo ""
echo "📁 ARQUIVOS IMPORTANTES:"

# Verificar arquivos essenciais
files=(".env" "package.json" "dist/index.html" "docker-compose.yml")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file: Existe"
    else
        echo "❌ $file: Não encontrado"
    fi
done

echo ""
echo "💾 ESPAÇO EM DISCO:"
df -h $PROJECT_DIR

echo ""
echo "🔧 PORTAS EM USO:"
sudo netstat -tlnp | grep -E ':80|:443|:3000|:3001'

echo ""
echo "📊 RECURSOS DO SISTEMA:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% em uso"
echo "RAM: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "Uptime: $(uptime -p)"

echo ""
echo "🔍 VERIFICAÇÃO CONCLUÍDA!"
echo ""
echo "📋 PRÓXIMAS AÇÕES (se necessário):"
echo "- Logs detalhados: docker-compose logs -f"
echo "- Reiniciar: docker-compose restart"
echo "- Verificar .env: cat .env"
echo "- Testar aplicação: http://$PUBLIC_IP"