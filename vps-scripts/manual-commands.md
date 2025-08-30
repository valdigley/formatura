# Comandos Manuais para VPS

Execute estes comandos diretamente na VPS se os scripts não funcionarem.

## 🔄 Atualização Manual Completa

```bash
cd /opt/foto-formatura

# Backup
cp .env .env.backup

# Parar aplicação
pm2 stop foto-formatura
pm2 delete foto-formatura

# Limpar e reinstalar
npm cache clean --force
rm -rf node_modules
npm install

# Build limpo
rm -rf dist
npm run build

# Verificar build
ls -la dist/

# Iniciar aplicação
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Testar
curl -I http://localhost:8080
```

## 🌐 Configurar Subdomínio

```bash
# Configurar Nginx
sudo tee /etc/nginx/sites-available/formatura.fotografo.site > /dev/null << 'EOF'
server {
    listen 80;
    server_name formatura.fotografo.site;
    root /opt/foto-formatura/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/formatura.fotografo.site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Configurar SSL

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Configurar SSL
sudo certbot --nginx -d formatura.fotografo.site
```

## 🔍 Verificações

```bash
# Status PM2
pm2 status

# Testar aplicação
curl -I http://localhost:8080
curl -I http://147.93.182.205:8080

# Testar DNS
nslookup formatura.fotografo.site

# Ver logs
pm2 logs foto-formatura --lines 10
```

## 🚨 Solução de Problemas

### Se aplicação não iniciar:
```bash
# Ver logs detalhados
pm2 logs foto-formatura

# Verificar se serve está instalado
npm install -g serve

# Tentar iniciar manualmente
serve -s dist -l 8080
```

### Se build falhar:
```bash
# Limpar cache
npm cache clean --force
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Build novamente
npm run build
```

### Se .env estiver errado:
```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://iisejjtimakkwjrbmzvj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpc2VqanRpbWFra3dqcmJtenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNDI4NzEsImV4cCI6MjA1MDkxODg3MX0.Ej6qJOQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQQGJOJQ
EOF
```