#!/bin/bash

# Script para configurar Git e fazer primeiro commit

set -e

echo "📝 Configurando Git para o projeto..."

# Verificar se já é um repositório
if [ -d ".git" ]; then
    echo "✅ Repositório Git já existe"
else
    echo "🔧 Inicializando repositório Git..."
    git init
fi

# Configurar Git se não estiver configurado
if [ -z "$(git config user.name)" ]; then
    echo "👤 Configurando usuário Git..."
    git config user.name "Foto Formatura System"
    git config user.email "admin@fotografo.site"
fi

# Criar .gitignore se não existir
if [ ! -f ".gitignore" ]; then
    echo "📄 Criando .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Production build
dist/
build/

# Environment variables
.env
.env.local
.env.production.local

# Logs
logs/
*.log

# PM2
.pm2/

# Temporary
tmp/
temp/
*.backup
*.bak
EOF
fi

# Adicionar arquivos
echo "📦 Adicionando arquivos ao Git..."
git add .

# Fazer commit inicial se necessário
if ! git log --oneline -1 2>/dev/null; then
    echo "💾 Fazendo commit inicial..."
    git commit -m "🎉 Initial commit - Sistema de Gestão de Sessões Fotográficas

✨ Funcionalidades:
- Gestão de formandos e turmas
- Pacotes fotográficos
- Agendamento de sessões
- Integração WhatsApp e Mercado Pago
- Dashboard e relatórios
- Formulário público de cadastro"
else
    echo "💾 Fazendo commit das mudanças..."
    git add .
    git commit -m "🔄 Update - $(date '+%Y-%m-%d %H:%M')" || echo "Nenhuma mudança para commitar"
fi

echo ""
echo "✅ Git configurado!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🌐 CRIAR REPOSITÓRIO NO GITHUB:"
echo "   - Acesse: https://github.com/new"
echo "   - Nome: foto-formatura"
echo "   - Deixe privado"
echo "   - NÃO inicialize com README"
echo ""
echo "2. 🔗 CONECTAR COM GITHUB:"
echo "   git remote add origin https://github.com/SEU-USUARIO/foto-formatura.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. 🚀 DEPLOY AUTOMÁTICO:"
echo "   chmod +x deploy-github.sh"
echo "   ./deploy-github.sh"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "- Ver status: git status"
echo "- Ver commits: git log --oneline"
echo "- Fazer push: git add . && git commit -m 'Update' && git push"