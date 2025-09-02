# Formatura – Sistema de Gestão de Turmas

> App web em **React + Vite + TypeScript** com backend **Supabase** (Auth, PostgREST e Edge Functions). Deploy estático (Nginx) com **PM2** servindo a pasta `dist` em `127.0.0.1:8080`.

---

## Sumário

* [Arquitetura](#arquitetura)
* [Requisitos](#requisitos)
* [Variáveis de ambiente](#variáveis-de-ambiente)
* [Setup local (dev)](#setup-local-dev)
* [Build](#build)
* [Deploy manual na VPS](#deploy-manual-na-vps)
* [Primeira instalação na VPS](#primeira-instalação-na-vps)
* [Fluxo de versionamento (Git)](#fluxo-de-versionamento-git)
* [Troubleshooting](#troubleshooting)

---

## Arquitetura

* **Frontend**: React + Vite (build estático em `dist/`, assets com hash para cache busting).
* **Auth e dados**: Supabase (URL e `anon key` via variáveis `VITE_*`).
* **Edge Functions**: chamadas HTTP (ex.: Mercado Pago) hospedadas no Supabase Functions.
* **Servidor**: Nginx (reverse proxy) ➜ PM2 servindo a pasta `dist` na porta 8080.

> Importante: **nunca** commitar segredos. O arquivo `.env` é ignorado pelo Git; use **`.env.sample`** como referência.

---

## Requisitos

* Node **v20+** e npm
* Git
* Projeto **Supabase** ativo (URL e chave pública **anon**)
* VPS com **Nginx** e **PM2**

---

## Variáveis de ambiente

Crie um arquivo `.env` na raiz (baseado em `.env.sample`).

```bash
VITE_SUPABASE_URL=https://SEU-PROJ.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_publica_aqui
```

> Essas variáveis são **embutidas no bundle** do Vite. Se mudar, **rebuild** é obrigatório.

---

## Setup local (dev)

```bash
# clonar
git clone https://github.com/valdigley/formatura.git
cd formatura

# preparar .env
cp .env.sample .env
# edite .env com sua URL e ANON KEY do Supabase

# instalar deps e rodar
npm ci
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173).

---

## Build

```bash
npm ci
npm run build
# saída em dist/
```

---

## Deploy manual na VPS

> Fluxo usado em produção. Supõe que o código é buildado em `/opt/builds/formatura-build` e publicado para `/opt/foto-formatura/dist`.

```bash
APP_DIR="/opt/foto-formatura"
cd /opt/builds/formatura-build

# atualizar código a partir do main (ou branch desejada)
git checkout main && git pull

# (garanta .env correto) – NÃO comitar .env
npm ci && npm run build

# backup e publicação
sudo mkdir -p "$APP_DIR/_backups"
TS=$(date +%Y%m%d-%H%M%S)
[ -d "$APP_DIR/dist" ] && sudo mv "$APP_DIR/dist" "$APP_DIR/_backups/dist-$TS"

sudo rsync -a --delete dist/ "$APP_DIR/dist/"
sudo chown -R www-data:www-data "$APP_DIR/dist"

# reiniciar serviço estático
pm2 restart foto-formatura
pm2 save
```

**Reiniciar sem rebuild** (quando só quer recomeçar o serviço):

```bash
pm2 restart foto-formatura && pm2 save
```

Validar rapidamente:

```bash
curl -I http://127.0.0.1:8080/ | head -n1
# e via domínio
curl -I https://SEU_DOMINIO/ | head -n1
```

---

## Primeira instalação na VPS

> Execute apenas na **primeira vez**.

```bash
sudo mkdir -p /opt/builds && cd /opt/builds

# pegar o código
git clone https://github.com/valdigley/formatura.git formatura-build
cd formatura-build

# CRIAR .env (NÃO commitar)
cp .env.sample .env
# edite .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

npm ci && npm run build

# publicar
sudo mkdir -p /opt/foto-formatura
sudo rsync -a --delete dist/ /opt/foto-formatura/dist/
sudo chown -R www-data:www-data /opt/foto-formatura/dist

# PM2 servindo estático na porta 8080
pm2 start "npx serve -s /opt/foto-formatura/dist -l 8080" --name foto-formatura
pm2 save
```

Exemplo de **server block** Nginx (proxy para 127.0.0.1:8080):

```nginx
server {
  server_name formatura.seu-dominio.com;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

> Ajuste o domínio e faça o reload do Nginx após habilitar TLS (certbot/letsencrypt).

---

## Fluxo de versionamento (Git)

* Crie branches de trabalho a partir de `main`, ex.: `server-fixes-YYYYMMDD-HHMM`.
* **Nunca** commite `.env`. O repo já ignora `.env` e inclui `.env.sample`.
* Ao finalizar, **abra um Pull Request** para `main` e faça o merge. Isso **não** faz deploy automático (manual conforme seção *Deploy*).

Comandos úteis:

```bash
# a partir do diretório de build na VPS
git checkout -b server-fixes-YYYYMMDD-HHMM
# edite/adicione arquivos
git add -A
git commit -m "feat/fix: descrição"
git push -u origin server-fixes-YYYYMMDD-HHMM
# abra PR no GitHub e faça o merge para main
```

---

## Troubleshooting

### 1) **Auth 401 / "Invalid API key"**

* Verifique `.env` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
* **Rebuild obrigatório** após editar `.env`: `npm run build` e republicar `dist/`.
* Teste direto a API: `curl -I "$VITE_SUPABASE_URL/auth/v1/health"`.

### 2) Página não atualiza / cache

* Vite gera nomes com **hash** (`index-xxxxx.js`). O HTML `index.html` aponta para o novo arquivo após rebuild.
* Se continuar vendo versão antiga, limpe cache do navegador ou force reload.
* Confira qual bundle está servindo:

  ```bash
  curl -sS https://SEU_DOMINIO/ | grep -Eo 'assets/index-[^"\)]+'
  ```

### 3) `vite.svg` 404

* Opcional. Se o app referenciar `/vite.svg`, coloque uma cópia em `/opt/foto-formatura/dist/vite.svg`.

### 4) Evolution API – HTTP 400 ao enviar WhatsApp

* Cheque **URL**, **API Key** e **instance name** nas configurações salvas no app.
* Formatação do número: teste variações `55DDD9xxxxxxx`, `DDD9xxxxxxx`, etc. (o app já tenta variações comuns).

### 5) Mercado Pago – falha ao criar link

* Garanta que as **credenciais** (sandbox vs produção) estejam corretas nas configurações salvas no app.
* Verifique logs das **Edge Functions** no Supabase (funções `mercadopago` e `mercadopago-webhook`).

### 6) PM2 / serviço caiu

```bash
pm2 status
pm2 logs foto-formatura --lines 100
pm2 restart foto-formatura && pm2 save
```

---

## Notas de segurança

* `.env` **nunca** deve ser versionado.
* A **anon key** do Supabase é pública, mas ainda assim **trata permissões no RLS** do Supabase corretamente.
* Mantenha o sistema atualizado (Node, PM2, Nginx) e use HTTPS no domínio.

---

## Roadmap rápido (sugestões)

* Automatizar deploy com GitHub Actions (build + rsync via SSH) opcional.
* Página de */health* simples servida pelo Nginx para monitoramento.
* Documentar os schemas/tables principais do Supabase (users, photographers, graduation\_classes, payments, etc.)

---

**Contato/Manutenção**

* Proprietário do repositório: `@valdigley`
* Branch padrão: `main`
* Branch de fixes atual: `server-fixes-20250902-2327`
