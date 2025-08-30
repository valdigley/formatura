# Sistema de Gestão de Sessões Fotográficas

Sistema completo para gerenciamento de sessões fotográficas de formatura com integração WhatsApp e Mercado Pago.

## 🌟 Funcionalidades

- 👥 **Gestão de Formandos** - Cadastro e controle completo
- 🎓 **Turmas de Formatura** - Organização por turmas e escolas
- 📦 **Pacotes Fotográficos** - Diferentes opções de serviços
- 📅 **Agendamento de Sessões** - Controle de datas e horários
- 💰 **Controle de Pagamentos** - Integração com Mercado Pago
- 📱 **WhatsApp Automático** - Mensagens via Evolution API
- 📊 **Dashboard e Relatórios** - Métricas e análises
- 🌐 **Formulário Público** - Cadastro online para formandos
- 📄 **Contratos Automáticos** - Geração e envio via WhatsApp

## 🚀 Deploy Rápido

### Opção 1: Bolt Hosting (Recomendado)
[![Deploy to Bolt](https://img.shields.io/badge/Deploy%20to-Bolt-blue)](https://bolt.new)

### Opção 2: VPS Manual
```bash
git clone https://github.com/seu-usuario/foto-formatura.git
cd foto-formatura
chmod +x quick-setup.sh
./quick-setup.sh
```

## ⚙️ Configuração

### 1. Supabase
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 2. WhatsApp (Evolution API)
- Configure sua instância Evolution API
- Adicione credenciais em: **Configurações → WhatsApp**

### 3. Mercado Pago
- Obtenha credenciais no [painel de desenvolvedores](https://www.mercadopago.com.br/developers)
- Configure em: **Configurações → Mercado Pago**

## 📱 Como Usar

### Para Fotógrafos:
1. **Cadastre turmas de formatura**
2. **Configure pacotes fotográficos**
3. **Compartilhe link de cadastro** com formandos
4. **Agende sessões fotográficas**
5. **Controle pagamentos** automaticamente

### Para Formandos:
1. **Acesse o link** enviado pelo fotógrafo
2. **Preencha seus dados**
3. **Escolha o pacote** fotográfico
4. **Efetue o pagamento** via Mercado Pago
5. **Receba confirmação** via WhatsApp

## 🔗 URLs Importantes

- **Sistema Principal:** `https://seu-dominio.com`
- **Cadastro Público:** `https://seu-dominio.com/cadastro-formando?photographer_id=ID`

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite com suas configurações

# Iniciar desenvolvimento
npm run dev
```

## 📊 Tecnologias

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Pagamentos:** Mercado Pago API
- **WhatsApp:** Evolution API
- **Deploy:** Bolt Hosting / VPS

## 🔧 Scripts de Deploy

### VPS com Docker:
```bash
chmod +x deploy.sh
./deploy.sh
```

### VPS sem Docker:
```bash
chmod +x deploy-simple.sh
./deploy-simple.sh
```

### Porta específica (8080):
```bash
chmod +x deploy-port-specific.sh
./deploy-port-specific.sh
```

## 🔄 Atualizações

### Via GitHub:
```bash
chmod +x update-from-github.sh
./update-from-github.sh
```

### Forçar atualização:
```bash
chmod +x force-update.sh
./force-update.sh
```

## 📞 Suporte

Para suporte técnico ou dúvidas sobre implementação, entre em contato através do sistema.

## 📄 Licença

Este projeto é privado e destinado ao uso específico do cliente.

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