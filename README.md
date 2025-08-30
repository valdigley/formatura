# Sistema de Gestão de Sessões Fotográficas

Sistema completo para gerenciamento de sessões fotográficas de formatura com integração WhatsApp e Mercado Pago.

## 🚀 Deploy na VPS

### Opção 1: Deploy Automático (Recomendado)

```bash
# Na VPS, clone o repositório
git clone https://github.com/seu-usuario/foto-formatura.git
cd foto-formatura

# Configure o .env
cp .env.production .env
nano .env  # Edite com suas configurações

# Execute o deploy
chmod +x quick-setup.sh
./quick-setup.sh
```

### Opção 2: Deploy Manual

```bash
# Instalar dependências
npm install

# Build da aplicação
npm run build

# Instalar serve
sudo npm install -g serve

# Iniciar com PM2
pm2 start serve --name foto-formatura -- -s dist -l 8080
pm2 save

# Configurar firewall
sudo ufw allow 8080
```

## 📋 Funcionalidades

- ✅ Gestão de formandos
- ✅ Turmas de formatura
- ✅ Pacotes fotográficos
- ✅ Agendamento de sessões
- ✅ Controle de pagamentos
- ✅ Integração WhatsApp (Evolution API)
- ✅ Integração Mercado Pago
- ✅ Relatórios e dashboards
- ✅ Formulário público de cadastro
- ✅ Geração automática de contratos

## 🔧 Configuração

### Supabase
1. Configure as variáveis no `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### WhatsApp (Evolution API)
1. Configure sua instância Evolution API
2. Adicione as credenciais nas configurações do sistema

### Mercado Pago
1. Obtenha suas credenciais no painel de desenvolvedores
2. Configure nas configurações do sistema

## 🌐 Acesso

Após o deploy, acesse:
- **Aplicação:** `http://seu-ip:8080`
- **Cadastro público:** `http://seu-ip:8080/cadastro-formando?photographer_id=ID`

## 📞 Suporte

Para suporte técnico, entre em contato através do sistema.