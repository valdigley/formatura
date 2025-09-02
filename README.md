# Sistema de Gestão de Sessões Fotográficas

Sistema completo para gerenciamento de sessões fotográficas de formatura com integração WhatsApp e Mercado Pago.

## 🚀 Deploy em VPS

### Opção 1: Deploy com Docker (Recomendado)

1. **Conecte na VPS e prepare os arquivos:**
```bash
# Conectar na VPS
ssh usuario@seu-ip

# Criar diretório e enviar arquivos
sudo mkdir -p /opt/foto-formatura
sudo chown $USER:$USER /opt/foto-formatura

# Enviar arquivos via SCP (do seu computador local):
scp -r . usuario@seu-ip:/opt/foto-formatura/
```

2. **Configure o ambiente:**
```bash
cd /opt/foto-formatura

# Copiar e editar arquivo de configuração
cp .env.example .env
nano .env

# Configure suas credenciais do Supabase:
# VITE_SUPABASE_URL=https://seu-projeto.supabase.co
# VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

3. **Execute o deploy:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Opção 2: Deploy Manual (sem Docker)

```bash
chmod +x deploy-manual.sh
./deploy-manual.sh
```

## 🔄 Atualizações

Para atualizar o sistema na VPS:

```bash
cd /opt/foto-formatura
chmod +x update-vps.sh
./update-vps.sh
```

## 🛠️ Funcionalidades

### 📸 Gestão de Formandos
- Cadastro completo de formandos
- Formulário público para auto-cadastro
- Integração com turmas de formatura
- Status de envio de contratos e pagamentos

### 📅 Sessões Fotográficas
- Agendamento de sessões
- Controle de produção
- Integração com Google Calendar
- Gestão de pacotes fotográficos

### 💰 Sistema de Pagamentos
- Integração com Mercado Pago
- Links de pagamento automáticos
- Webhooks para confirmação
- Controle financeiro completo

### 📱 WhatsApp Automático
- Envio automático de contratos
- Solicitações de pagamento
- Confirmações de recebimento
- Múltiplos formatos de telefone

### 📊 Dashboard e Relatórios
- Métricas em tempo real
- Gráficos de performance
- Relatórios exportáveis
- Alertas e notificações

## ⚙️ Configuração

### 1. Supabase
- Configure as tabelas usando as migrations
- Configure RLS (Row Level Security)
- Configure as Edge Functions

### 2. WhatsApp (Evolution API)
- Configure uma instância da Evolution API
- Conecte o WhatsApp via QR Code
- Configure as credenciais no sistema

### 3. Mercado Pago
- Crie uma aplicação no painel de desenvolvedores
- Configure credenciais de sandbox/produção
- Configure webhooks para notificações

## 🔒 Segurança

### SSL/HTTPS
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### Firewall
```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh
sudo ufw enable
```

## 📋 Monitoramento

### Logs
```bash
# Docker
docker-compose logs -f

# PM2
pm2 logs foto-formatura

# Nginx
sudo tail -f /var/log/nginx/error.log
```

### Status
```bash
# Docker
docker-compose ps

# PM2
pm2 status

# Nginx
sudo systemctl status nginx
```

## 🆘 Solução de Problemas

### Aplicação não carrega
1. Verificar logs: `docker-compose logs -f`
2. Verificar .env: `cat .env`
3. Testar conexão: `curl http://localhost/health`

### WhatsApp não envia
1. Verificar conexão nas configurações
2. Testar com mensagem de teste
3. Verificar logs de erro nos formandos

### Pagamentos não funcionam
1. Verificar credenciais do Mercado Pago
2. Testar conexão nas configurações
3. Verificar webhooks no painel MP

## 📞 Suporte

Para problemas específicos:
1. Verificar logs detalhados
2. Testar configurações individuais
3. Verificar conectividade de rede
4. Validar credenciais das APIs

## 🔄 Backup e Restore

### Backup automático
```bash
# Criar backup
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    .
```

### Restore
```bash
# Restaurar backup
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz
npm run build
docker-compose up -d --build
```

## 📈 Performance

### Otimizações incluídas:
- Compressão Gzip
- Cache de assets estáticos
- Otimização de imagens
- Minificação de código
- Headers de segurança

### Monitoramento:
- Health checks automáticos
- Logs estruturados
- Métricas de performance
- Alertas de sistema