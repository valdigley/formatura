#!/bin/bash

echo "🔍 Identificando sistema de deploy na VPS..."
echo ""

# Verificar Docker
echo "🐳 DOCKER:"
if command -v docker &> /dev/null; then
    echo "✅ Docker instalado: $(docker --version)"
    
    if command -v docker-compose &> /dev/null; then
        echo "✅ Docker Compose instalado: $(docker-compose --version)"
        
        if [ -f "docker-compose.yml" ]; then
            echo "✅ Arquivo docker-compose.yml encontrado"
            
            # Verificar se containers estão rodando
            if docker-compose ps | grep -q "Up"; then
                echo "✅ Containers Docker estão RODANDO"
                echo ""
                echo "📊 Status dos containers:"
                docker-compose ps
                echo ""
                echo "🔧 COMANDO PARA REINICIAR:"
                echo "docker-compose down && docker-compose up -d"
            else
                echo "⚠️  Containers Docker não estão rodando"
                echo ""
                echo "🔧 COMANDO PARA INICIAR:"
                echo "docker-compose up -d"
            fi
        else
            echo "❌ Arquivo docker-compose.yml não encontrado"
        fi
    else
        echo "❌ Docker Compose não instalado"
    fi
else
    echo "❌ Docker não instalado"
fi

echo ""
echo "🔥 PM2:"
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 instalado: $(pm2 --version)"
    
    # Verificar se há processos PM2 rodando
    if pm2 list | grep -q "online"; then
        echo "✅ Processos PM2 estão RODANDO"
        echo ""
        echo "📊 Status do PM2:"
        pm2 status
        echo ""
        echo "🔧 COMANDO PARA REINICIAR:"
        echo "pm2 restart all"
    else
        echo "⚠️  Nenhum processo PM2 rodando"
        
        if [ -f "ecosystem.config.js" ]; then
            echo "✅ Arquivo ecosystem.config.js encontrado"
            echo ""
            echo "🔧 COMANDO PARA INICIAR:"
            echo "pm2 start ecosystem.config.js"
        fi
    fi
else
    echo "❌ PM2 não instalado"
fi

echo ""
echo "🌐 NGINX:"
if command -v nginx &> /dev/null; then
    echo "✅ Nginx instalado: $(nginx -v 2>&1)"
    
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx está RODANDO"
        echo ""
        echo "🔧 COMANDO PARA RECARREGAR:"
        echo "sudo systemctl reload nginx"
    else
        echo "❌ Nginx não está rodando"
        echo ""
        echo "🔧 COMANDO PARA INICIAR:"
        echo "sudo systemctl start nginx"
    fi
else
    echo "❌ Nginx não instalado"
fi

echo ""
echo "📁 ARQUIVOS DO PROJETO:"
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
fi

if [ -d "dist" ]; then
    echo "✅ Pasta dist encontrada (build da aplicação)"
fi

if [ -d "src" ]; then
    echo "✅ Pasta src encontrada (código fonte)"
fi

if [ -f ".env" ]; then
    echo "✅ Arquivo .env encontrado"
    echo "📋 Conteúdo do .env:"
    cat .env | head -5
else
    echo "❌ Arquivo .env não encontrado"
fi

echo ""
echo "🔍 PROCESSOS RODANDO NA PORTA 80:"
sudo netstat -tlnp | grep :80 || echo "Nenhum processo na porta 80"

echo ""
echo "🔍 PROCESSOS RODANDO NA PORTA 3000:"
sudo netstat -tlnp | grep :3000 || echo "Nenhum processo na porta 3000"

echo ""
echo "📊 RESUMO:"
echo "========================================"

# Determinar qual sistema está sendo usado
if docker-compose ps 2>/dev/null | grep -q "Up"; then
    echo "🎯 SISTEMA DETECTADO: DOCKER"
    echo "🔧 COMANDO PARA REINICIAR APÓS ALTERAR .env:"
    echo "   docker-compose down && docker-compose up -d"
elif pm2 list 2>/dev/null | grep -q "online"; then
    echo "🎯 SISTEMA DETECTADO: PM2"
    echo "🔧 COMANDO PARA REINICIAR APÓS ALTERAR .env:"
    echo "   npm run build && pm2 restart all"
elif systemctl is-active --quiet nginx && [ -d "dist" ]; then
    echo "🎯 SISTEMA DETECTADO: NGINX (Arquivos Estáticos)"
    echo "🔧 COMANDO PARA REINICIAR APÓS ALTERAR .env:"
    echo "   npm run build && sudo systemctl reload nginx"
else
    echo "❓ SISTEMA NÃO IDENTIFICADO"
    echo "🔧 COMANDOS POSSÍVEIS:"
    echo "   - Se usar Docker: docker-compose down && docker-compose up -d"
    echo "   - Se usar PM2: pm2 restart all"
    echo "   - Se usar Nginx: npm run build && sudo systemctl reload nginx"
fi

echo "========================================"