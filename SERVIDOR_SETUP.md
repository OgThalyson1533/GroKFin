# 🚀 Como Iniciar o Servidor GrokFin Elite

## Pré-requisitos

- **Node.js** >= 16.0.0 instalado
- Arquivo `.env.local` em `supabase/.env.local` com as credenciais

---

## Instalação

### Passo 1: Instalar dependências

```bash
npm install
```

Isso instala:
- `express` — servidor web
- `dotenv` — carrega variáveis do `.env.local`

---

## Execução

### Passo 2: Iniciar o servidor

```bash
npm start
```

Você verá:

```
╔════════════════════════════════════════════════════════════╗
║  🚀 GrokFin Elite v6 — Servidor de Credenciais           ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Servidor rodando em: http://localhost:3000            ║
║  📂 Lendo credenciais de: ./supabase/.env.local           ║
║  🔐 Injetando automaticamente no app.html                ║
╠════════════════════════════════════════════════════════════╣
║  Acesse:                                                   ║
║  • Login: http://localhost:3000/index.html               ║
║  • App:   http://localhost:3000/app.html                 ║
╚════════════════════════════════════════════════════════════╝
```

### Passo 3: Acessar a aplicação

Abra no navegador:
- **Login:** `http://localhost:3000/index.html`
- **App:** `http://localhost:3000/app.html`

---

## Como Funciona

```
.env.local (credenciais)
    ↓
server.js (lê .env.local via dotenv)
    ↓
Usuário acessa /app.html
    ↓
Servidor injeta credenciais dinamicamente no HTML
    ↓
window.__ENV_SUPABASE_URL e window.__ENV_SUPABASE_ANON_KEY carregadas ✅
```

---

## Mudando Credenciais

Se você precisar mudar as credenciais:

1. **Edite** `supabase/.env.local`:
   ```env
   SUPABASE_URL=https://novo-url.supabase.co
   SUPABASE_ANON_KEY=nova_chave_publica
   ```

2. **Salve** o arquivo

3. **Recarregue** a página no navegador (ou reinicie o servidor)

4. **Pronto!** Novos usuários veem as novas credenciais 🎉

---

## Parar o Servidor

Pressione `Ctrl+C` no terminal:

```bash
^C
[ENCERRAMENTO] Fechando servidor...
```

---

## Troubleshooting

### ❌ "Port 3000 already in use"

Use outra porta:

```bash
PORT=4000 npm start
```

---

### ❌ "Cannot find module 'express'"

Instale as dependências:

```bash
npm install
```

---

### ❌ ".env.local not found"

Certifique-se que o arquivo existe em:
```
supabase/.env.local
```

Com conteúdo:
```env
SUPABASE_URL=https://seu-url.supabase.co
SUPABASE_ANON_KEY=sua_chave_publica
```

---

## Segurança

✅ **Por que é seguro:**

- `.env.local` nunca é enviado ao cliente
- Só as credenciais públicas (ANON_KEY) são injetadas
- SERVICE_ROLE_KEY **NUNCA** é exposto
- RLS no Supabase protege dados sensíveis

---

_GrokFin Elite v6 — Servidor de Credenciais Automáticas_
