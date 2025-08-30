#!/bin/bash

# Instalação completa do Sistema de Gestão de Sessões Fotográficas
# Execute na VPS após limpar tudo

set -e

echo "🚀 INSTALAÇÃO COMPLETA DO SISTEMA"
echo "📅 $(date)"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "/opt/foto-formatura" ]; then
    echo "📁 Criando diretório do projeto..."
    mkdir -p /opt/foto-formatura
fi

cd /opt/foto-formatura

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "✅ Node.js: $(node --version)"
echo "✅ NPM: $(npm --version)"

# Instalar ferramentas globais
echo "📦 Instalando PM2 e serve..."
npm install -g pm2 serve

# Criar package.json
echo "📝 Criando package.json..."
cat > package.json << 'PKGJSON'
{
  "name": "sistema-gestao-sessoes-fotograficas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.1",
    "@supabase/supabase-js": "^2.56.1",
    "@types/react-router-dom": "^5.3.3",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.62.0",
    "react-router-dom": "^7.8.2",
    "recharts": "^3.1.2",
    "zod": "^4.1.5"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "eslint": "^9.9.1",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "globals": "^15.9.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.3.0",
    "vite": "^5.4.2"
  }
}
PKGJSON

# Criar .env
echo "📝 Criando .env..."
cat > .env << 'ENVFILE'
VITE_SUPABASE_URL=https://iisejjtimakkwjrbmzvj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc2VqanRpbWFra3dqcmJtenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNDI4NzEsImV4cCI6MjA1MDkxODg3MX0.Ej6qJOQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQ
ENVFILE

# Instalar dependências
echo "📦 Instalando dependências (pode demorar alguns minutos)..."
npm install

echo "✅ Dependências instaladas!"
echo "📋 Próximo passo: Vou criar os arquivos do projeto..."
EOF

chmod +x complete-install.sh
./complete-install.sh