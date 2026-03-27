/**
 * server.js — GrokFin Elite v6
 * Servidor que injeta credenciais do .env.local
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Função para ler .env.local manualmente
function readEnvLocal() {
  const envPath = path.join(__dirname, 'supabase', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      env[match[1]] = match[2].trim();
    }
  });
  
  return env;
}

const envVars = readEnvLocal();
const SUPABASE_URL = envVars.SUPABASE_URL || 'https://glyjmoacozaxucvkpxfj.supabase.co';
const SUPABASE_ANON_KEY = envVars.SUPABASE_ANON_KEY || 'sb_publishable_ENfLOk9iK8-5yqn-OSQ8pw_GCmDqK7c';

console.log(`\n[✓ Credenciais .env.local carregadas]`);
console.log(`  URL: ${SUPABASE_URL.substring(0, 40)}...`);
console.log(`  Key: ${SUPABASE_ANON_KEY.substring(0, 30)}...\n`);

// Middleware: servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Rota especial: app.html com credenciais injetadas
app.get('/app.html', (req, res) => {
  const filePath = path.join(__dirname, 'app.html');
  let html = fs.readFileSync(filePath, 'utf-8');
  
  // Substituição SUPER SIMPLES - procura e substitui texto exato
  const oldUrl = "window.__ENV_SUPABASE_URL = 'https://glyjmoacozaxucvkpxfj.supabase.co';";
  const newUrl = `window.__ENV_SUPABASE_URL = '${SUPABASE_URL}';`;
  
  const oldKey = "window.__ENV_SUPABASE_ANON_KEY = 'sb_publishable_ENfLOk9iK8-5yqn-OSQ8pw_GCmDqK7c';";
  const newKey = `window.__ENV_SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';`;
  
  html = html.replace(oldUrl, newUrl);
  html = html.replace(oldKey, newKey);
  
  console.log(`[✓ /app.html carregado com credenciais]`);
  res.send(html);
});

// Rota: debug.html com verificação
app.get('/debug.html', (req, res) => {
  const filePath = path.join(__dirname, 'debug.html');
  let html = fs.readFileSync(filePath, 'utf-8');
  
  // Inject no debug.html também
  html = html.replace("'https://glyjmoacozaxucvkpxfj.supabase.co'", `'${SUPABASE_URL}'`);
  html = html.replace("'sb_publishable_ENfLOk9iK8-5yqn-OSQ8pw_GCmDqK7c'", `'${SUPABASE_ANON_KEY}'`);
  
  res.send(html);
});

// Rota: index.html normal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 GrokFin Elite v6 — Servidor de Credenciais           ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Servidor rodando em: http://localhost:${PORT}          ║
║  📂 Credenciais de: ./supabase/.env.local                  ║
║  🔐 Injetando em: /app.html e /debug.html                 ║
╠════════════════════════════════════════════════════════════╣
║  Acesse:                                                   ║
║  • Debug: http://localhost:${PORT}/debug.html              ║
║  • Login: http://localhost:${PORT}/index.html              ║
║  • App:   http://localhost:${PORT}/app.html                ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[ENCERRAMENTO] Fechando servidor...');
  process.exit(0);
});
