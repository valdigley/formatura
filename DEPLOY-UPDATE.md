# 🚀 Atualização da VPS - Sistema de Gestão de Sessões Fotográficas

## Opção 1: Atualização Automática (Recomendada)

### 1. Conectar na VPS
```bash
ssh usuario@seu-ip
cd /opt/foto-formatura
```

### 2. Fazer backup e atualizar
```bash
# Dar permissão ao script de atualização
chmod +x update-vps.sh

# Executar atualização
./update-vps.sh
```

## Opção 2: Atualização Manual

### 1. Backup da versão atual
```bash
cd /opt/foto-formatura
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /opt/backups/foto-formatura
tar -czf /opt/backups/foto-formatura/backup_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    .
```

### 2. Atualizar arquivos
```bash
# Opção A: Se usando Git
git pull origin main

# Opção B: Upload manual dos arquivos
# Use SCP ou SFTP para enviar os novos arquivos
```

### 3. Instalar dependências e fazer build
```bash
npm install
npm run build
```

### 4. Reiniciar aplicação

**Com Docker:**
```bash
docker-compose down
docker-compose up -d --build
docker-compose ps
```

**Com PM2:**
```bash
pm2 restart foto-formatura
pm2 status
```

**Apenas Nginx:**
```bash
sudo systemctl reload nginx
```

## Verificações Pós-Atualização

### 1. Testar aplicação
- Acesse: `http://seu-ip` ou `https://seu-dominio.com`
- Faça login no sistema
- Teste o cadastro de formandos
- Verifique se os contratos estão sendo enviados via WhatsApp

### 2. Verificar logs
```bash
# Com Docker
docker-compose logs -f app

# Com PM2
pm2 logs foto-formatura

# Nginx
sudo tail -f /var/log/nginx/error.log
```

### 3. Testar funcionalidades principais
- [ ] Login funcionando
- [ ] Cadastro de formandos
- [ ] Envio de contratos via WhatsApp
- [ ] Criação de turmas
- [ ] Agendamento de sessões
- [ ] Dashboard com estatísticas

## Principais Melhorias desta Versão

### 🔧 Sistema de WhatsApp Aprimorado
- Testa múltiplas variações de telefone automaticamente
- Melhor tratamento de erros
- Logs detalhados de envio

### 📊 Dashboard Melhorado
- Indicadores visuais de status de envio
- Alertas para contratos não enviados
- Estatísticas mais precisas

### 📱 Formulário Público Otimizado
- Melhor validação de dados
- Envio automático de contratos
- Sistema de pagamento integrado

## Rollback (se necessário)

Se algo der errado, você pode voltar à versão anterior:

```bash
cd /opt/foto-formatura

# Parar aplicação
docker-compose down  # ou pm2 stop foto-formatura

# Restaurar backup
tar -xzf /opt/backups/foto-formatura/backup_YYYYMMDD_HHMMSS.tar.gz

# Fazer build e reiniciar
npm run build
docker-compose up -d  # ou pm2 restart foto-formatura
```

## Suporte

Se encontrar problemas:

1. **Verificar logs** primeiro
2. **Testar conexão** WhatsApp nas configurações
3. **Verificar credenciais** do Mercado Pago
4. **Conferir variáveis** de ambiente no `.env`

Para suporte adicional, verifique os logs detalhados e as mensagens de erro específicas.