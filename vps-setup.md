# Deploy na VPS - Sistema de Gestão de Sessões Fotográficas

## Pré-requisitos

1. **VPS com Ubuntu/Debian**
2. **Acesso SSH à VPS**
3. **Domínio configurado (opcional)**
4. **Projeto Supabase configurado**

## Opção 1: Deploy com Docker (Recomendado)

### 1. Preparar arquivos na VPS

```bash
# Conectar na VPS
ssh usuario@seu-ip

# Clonar ou enviar arquivos do projeto
# Opção A: Se usar Git
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio

# Opção B: Enviar arquivos via SCP
# No seu computador local:
# scp -r . usuario@seu-ip:/opt/foto-formatura/
```

### 2. Configurar variáveis de ambiente

```bash
# Editar arquivo .env
nano .env

# Adicionar suas configurações do Supabase:
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 3. Executar deploy

```bash
# Dar permissão de execução
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

## Opção 2: Deploy Manual (sem Docker)

### 1. Preparar VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 e Nginx
sudo npm install -g pm2
sudo apt install -y nginx
```

### 2. Configurar projeto

```bash
# Executar script de deploy manual
chmod +x deploy-manual.sh
./deploy-manual.sh
```

## Configuração de SSL (HTTPS)

### Após o deploy básico:

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Configurar SSL para seu domínio
sudo certbot --nginx -d seu-dominio.com

# Verificar renovação automática
sudo certbot renew --dry-run
```

## Configuração de Firewall

```bash
# Configurar UFW (se não estiver configurado)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Monitoramento e Manutenção

### Comandos úteis:

```bash
# Ver logs da aplicação
docker-compose logs -f app  # Com Docker
pm2 logs foto-formatura     # Sem Docker

# Reiniciar aplicação
docker-compose restart      # Com Docker
pm2 restart foto-formatura  # Sem Docker

# Verificar status
docker-compose ps           # Com Docker
pm2 status                  # Sem Docker

# Atualizar aplicação
git pull
docker-compose up -d --build  # Com Docker
npm run build && pm2 restart foto-formatura  # Sem Docker
```

## Backup

### Configurar backup automático:

```bash
# Criar script de backup
sudo nano /opt/backup-foto-formatura.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/foto-formatura"
PROJECT_DIR="/opt/foto-formatura"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $PROJECT_DIR .

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

# Dar permissão
sudo chmod +x /opt/backup-foto-formatura.sh

# Adicionar ao crontab (backup diário às 2h)
echo "0 2 * * * /opt/backup-foto-formatura.sh" | sudo crontab -
```

## Solução de Problemas

### Se a aplicação não carregar:

1. **Verificar logs:**
   ```bash
   docker-compose logs app
   # ou
   pm2 logs foto-formatura
   ```

2. **Verificar Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Verificar variáveis de ambiente:**
   ```bash
   cat .env
   ```

### Se os webhooks não funcionarem:

1. **Verificar URL do webhook no Mercado Pago:**
   - Deve ser: `https://seu-dominio.com/api/webhooks/mercadopago`
   - Ou: `http://seu-ip/api/webhooks/mercadopago`

2. **Verificar logs do Supabase Edge Functions**

3. **Testar webhook manualmente:**
   ```bash
   curl -X POST https://seu-dominio.com/api/webhooks/mercadopago \
     -H "Content-Type: application/json" \
     -d '{"type":"payment","data":{"id":"123"}}'
   ```

## Configurações Adicionais

### Para melhor performance:

1. **Configurar CDN (Cloudflare)**
2. **Otimizar imagens**
3. **Configurar cache do navegador**
4. **Monitoramento com Uptime Robot**

### Para segurança:

1. **Configurar fail2ban**
2. **Atualizar sistema regularmente**
3. **Backup automático**
4. **Monitoramento de logs**