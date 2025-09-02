# 📋 Guia de Instalação - Sistema de Gestão de Sessões Fotográficas

## 🎯 Visão Geral

Este sistema permite gerenciar sessões fotográficas de formatura com:
- ✅ Cadastro automático de formandos
- 📱 Envio de contratos via WhatsApp
- 💰 Pagamentos via Mercado Pago
- 📊 Dashboard completo
- 📈 Relatórios detalhados

## 🚀 Instalação em VPS

### Pré-requisitos

- **VPS com Ubuntu/Debian** (mínimo 1GB RAM, 1 CPU)
- **Acesso SSH** à VPS
- **Domínio configurado** (opcional, mas recomendado)
- **Projeto Supabase** configurado

### Método 1: Deploy Automático com Docker (Recomendado)

#### 1. Preparar VPS
```bash
# Conectar na VPS
ssh root@seu-ip

# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências básicas
apt install -y curl wget git unzip
```

#### 2. Enviar arquivos do projeto
```bash
# Opção A: Via Git (se o projeto estiver no GitHub)
git clone https://github.com/seu-usuario/foto-formatura.git /opt/foto-formatura
cd /opt/foto-formatura

# Opção B: Via SCP (do seu computador local)
# scp -r . root@seu-ip:/opt/foto-formatura/
# ssh root@seu-ip
# cd /opt/foto-formatura
```

#### 3. Configurar ambiente
```bash
# Copiar arquivo de configuração
cp .env.example .env

# Editar configurações
nano .env
```

**Configure no .env:**
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
NODE_ENV=production
DOMAIN=seu-dominio.com
EMAIL=seu-email@exemplo.com
```

#### 4. Executar deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

### Método 2: Deploy Manual (sem Docker)

```bash
chmod +x deploy-manual.sh
./deploy-manual.sh
```

### Método 3: Deploy Rápido (Docker já instalado)

```bash
chmod +x quick-deploy.sh
./quick-deploy.sh
```

## 🔧 Configuração Pós-Deploy

### 1. Configurar Supabase

1. **Acesse a aplicação:** `http://seu-ip`
2. **Crie uma conta** ou faça login
3. **Configure as tabelas** (se não feito automaticamente)

### 2. Configurar WhatsApp

1. **Acesse:** Configurações → WhatsApp
2. **Configure Evolution API:**
   - URL da API
   - API Key
   - Nome da instância
3. **Teste a conexão**
4. **Envie mensagem de teste**

### 3. Configurar Mercado Pago

1. **Acesse:** Configurações → Mercado Pago
2. **Configure credenciais:**
   - Public Key
   - Access Token
   - Ambiente (Sandbox/Produção)
3. **Teste a conexão**
4. **Configure webhook URL**

### 4. Configurar SSL (HTTPS)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Configurar SSL
sudo certbot --nginx -d seu-dominio.com

# Verificar renovação automática
sudo certbot renew --dry-run
```

## 🔄 Atualizações

### Atualização Automática
```bash
cd /opt/foto-formatura
./update-vps.sh
```

### Atualização Manual
```bash
cd /opt/foto-formatura

# Backup
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz .

# Atualizar arquivos (Git ou SCP)
git pull  # ou enviar novos arquivos

# Rebuild
npm install
npm run build
docker-compose up -d --build
```

## 📊 Monitoramento

### Verificar Saúde do Sistema
```bash
cd /opt/foto-formatura
chmod +x health-check.sh
./health-check.sh
```

### Logs Importantes
```bash
# Aplicação
docker-compose logs -f app

# Nginx
docker-compose logs -f nginx

# Sistema
sudo journalctl -u nginx -f
```

### Comandos Úteis
```bash
# Status dos containers
docker-compose ps

# Reiniciar aplicação
docker-compose restart

# Parar tudo
docker-compose down

# Ver uso de recursos
docker stats

# Limpar espaço
docker system prune -f
```

## 🛡️ Segurança

### Firewall Básico
```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

### Backup Automático
```bash
# Criar script de backup
sudo tee /opt/backup-foto-formatura.sh > /dev/null << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/foto-formatura"
PROJECT_DIR="/opt/foto-formatura"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $PROJECT_DIR \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=logs \
    .

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup criado: backup_$DATE.tar.gz"
EOF

# Dar permissão
sudo chmod +x /opt/backup-foto-formatura.sh

# Adicionar ao crontab (backup diário às 2h)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-foto-formatura.sh") | crontab -
```

## 🆘 Solução de Problemas

### Problema: Aplicação não carrega
```bash
# Verificar logs
docker-compose logs app

# Verificar nginx
sudo nginx -t
sudo systemctl status nginx

# Verificar .env
cat .env
```

### Problema: WhatsApp não envia
```bash
# Verificar configuração
# Acesse: Configurações → WhatsApp → Testar Conexão

# Verificar logs de erro nos formandos
# Veja as observações dos formandos para detalhes do erro
```

### Problema: Pagamentos não funcionam
```bash
# Verificar configuração do Mercado Pago
# Acesse: Configurações → Mercado Pago → Testar Conexão

# Verificar webhooks
curl -X POST http://seu-ip/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123"}}'
```

### Problema: Porta em uso
```bash
# Verificar o que está usando a porta
sudo lsof -i :80
sudo lsof -i :3000

# Parar processo se necessário
sudo kill -9 PID
```

## 📞 Suporte

### Logs Detalhados
```bash
# Ver todos os logs
docker-compose logs

# Logs específicos
docker-compose logs app
docker-compose logs nginx

# Logs do sistema
sudo journalctl -xe
```

### Verificar Configurações
```bash
# Verificar .env
cat .env

# Verificar docker-compose
docker-compose config

# Verificar nginx
sudo nginx -t
```

### Teste Manual
```bash
# Testar aplicação
curl -I http://localhost/
curl -I http://seu-ip/

# Testar health check
curl http://localhost/health
```

## 🎯 Checklist Final

Após a instalação, verifique:

- [ ] ✅ Aplicação carrega em `http://seu-ip`
- [ ] ✅ Login funciona
- [ ] ✅ Dashboard mostra dados
- [ ] ✅ WhatsApp conectado e testado
- [ ] ✅ Mercado Pago configurado e testado
- [ ] ✅ Cadastro de formandos funciona
- [ ] ✅ Envio de contratos via WhatsApp
- [ ] ✅ Links de pagamento funcionam
- [ ] ✅ SSL configurado (se usando domínio)
- [ ] ✅ Backup automático configurado

## 🚀 Pronto para Produção!

Seu sistema está pronto para gerenciar sessões fotográficas de formatura com total automação!