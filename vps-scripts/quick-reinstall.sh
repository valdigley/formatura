#!/bin/bash

# Script rápido para reinstalar apenas o código
# Execute na VPS: ./quick-reinstall.sh

echo "🔄 REINSTALAÇÃO RÁPIDA..."

cd /opt/foto-formatura

# Backup do .env
cp .env .env.backup 2>/dev/null || echo "Sem .env para backup"

# Parar aplicação
pm2 stop foto-formatura 2>/dev/null || echo "App não estava rodando"

# Limpar tudo exceto .env
find . -maxdepth 1 ! -name '.env*' ! -name '.' -exec rm -rf {} + 2>/dev/null || true

# Recriar package.json
cat > package.json << 'EOF'
{
  "name": "sistema-gestao-sessoes-fotograficas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.56.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^3.1.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}
EOF

# Restaurar .env
cp .env.backup .env 2>/dev/null || echo "Sem backup para restaurar"

# Instalar e buildar
npm install
npm run build

# Reiniciar
pm2 delete foto-formatura 2>/dev/null || echo "OK"
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

sleep 3

# Testar
curl -I http://localhost:8080
echo "✅ Reinstalação rápida concluída!"