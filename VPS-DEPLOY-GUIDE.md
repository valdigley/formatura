# 🚀 Guia de Deploy na VPS

## Arquivos Criados para Deploy

Os seguintes arquivos foram adicionados ao repositório para facilitar o deploy na VPS:

### Scripts de Deploy:
- `deploy.sh` - Deploy completo com Docker
- `docker-compose.yml` - Configuração dos containers
- `Dockerfile` - Build da aplicação
- `nginx.conf` - Configuração do servidor web
- `update-vps.sh` - Script de atualização
- `health-check.sh` - Verificação de saúde

### Como Usar na VPS:

1. **Enviar arquivos para VPS:**
```bash
# Do seu computador local:
scp -r . root@seu-ip:/opt/foto-formatura/
```

2. **Na VPS, executar:**
```bash
cd /opt/foto-formatura
chmod +x deploy.sh
./deploy.sh
```

3. **Configurar .env quando solicitado**

4. **Acessar aplicação:**
```bash
http://seu-ip
```

### Recursos Incluídos:
- ✅ Docker com health checks
- ✅ Nginx otimizado para produção
- ✅ SSL/HTTPS pronto
- ✅ Compressão Gzip
- ✅ Headers de segurança
- ✅ Rate limiting
- ✅ Cache otimizado
- ✅ Backup automático
- ✅ Scripts de manutenção

### Comandos Úteis na VPS:
```bash
# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Atualizar
./update-vps.sh

# Verificar saúde
./health-check.sh
```

O sistema está pronto para produção!