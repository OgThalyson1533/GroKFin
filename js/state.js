/**
 * js/state.js — GrokFin Elite v6
 * Gerenciamento de estado: loadState, saveState, buildSeedState.
 * O state object é a única fonte de verdade para toda a aplicação.
 */

import { STORAGE_KEY } from './config.js';
import { uid }         from './utils/math.js';
import { formatDateBR, addMonths } from './utils/date.js';

// ── Helpers internos ──────────────────────────────────────────────────────────
export const state = {};
const LEGACY_STORAGE_KEY = 'grokfin_elite_v4_state';

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function createSvgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createDefaultBannerDataUrl() {
  return createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 640">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#09111c"/>
          <stop offset="55%" stop-color="#0a1322"/>
          <stop offset="100%" stop-color="#071019"/>
        </linearGradient>
        <radialGradient id="glowA" cx="0.2" cy="0.2" r="0.65">
          <stop offset="0%" stop-color="rgba(0,245,255,.95)"/>
          <stop offset="100%" stop-color="rgba(0,245,255,0)"/>
        </radialGradient>
        <radialGradient id="glowB" cx="0.85" cy="0.15" r="0.5">
          <stop offset="0%" stop-color="rgba(168,85,247,.9)"/>
          <stop offset="100%" stop-color="rgba(168,85,247,0)"/>
        </radialGradient>
        <radialGradient id="glowC" cx="0.7" cy="0.85" r="0.48">
          <stop offset="0%" stop-color="rgba(0,255,133,.75)"/>
          <stop offset="100%" stop-color="rgba(0,255,133,0)"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="640" fill="url(#bg)"/>
      <rect width="1600" height="640" fill="url(#glowA)" opacity="0.24"/>
      <rect width="1600" height="640" fill="url(#glowB)" opacity="0.20"/>
      <rect width="1600" height="640" fill="url(#glowC)" opacity="0.22"/>
      <g opacity="0.85">
        <rect x="104" y="104" width="190" height="190" rx="44" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.08)"/>
        <text x="199" y="225" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="98" font-weight="900" fill="#E6FDFF">G</text>
      </g>
    </svg>
  `);
}

function createDefaultAvatarDataUrl(name = 'GrokFin User') {
  const initials = (String(name).trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2) || 'GF').toUpperCase();
  return createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="avatarBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#00F5FF"/>
          <stop offset="100%" stop-color="#00FF85"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="140" fill="#08111C"/>
      <circle cx="256" cy="256" r="208" fill="url(#avatarBg)" opacity="0.95"/>
      <text x="256" y="292" text-anchor="middle" font-family="Inter, Arial, sans-serif"
            font-size="140" font-weight="900" fill="#071019">${initials}</text>
    </svg>
  `);
}

// ── buildSeedState ────────────────────────────────────────────────────────────

export function buildSeedState() {
  const today = new Date();

  const transactions = [
    { id: uid('tx'), date: formatDateBR(addDays(today, 0)),   desc: 'Extra Supermercado',   cat: 'Alimentação',   value: -142.30 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -1)),  desc: 'Uber',                  cat: 'Transporte',    value: -28.50  },
    { id: uid('tx'), date: formatDateBR(addDays(today, -2)),  desc: 'Salário Nubank',         cat: 'Receita',       value: 5200.00 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -3)),  desc: 'Amazon Prime Video',     cat: 'Assinaturas',   value: -19.90  },
    { id: uid('tx'), date: formatDateBR(addDays(today, -4)),  desc: 'XP Investimentos',       cat: 'Investimentos', value: -600.00 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -5)),  desc: 'Farmácia Droga Raia',    cat: 'Saúde',         value: -86.40  },
    { id: uid('tx'), date: formatDateBR(addDays(today, -7)),  desc: 'iFood Express',           cat: 'Alimentação',   value: -68.20  },
    { id: uid('tx'), date: formatDateBR(addDays(today, -8)),  desc: 'Conta de Luz',            cat: 'Moradia',       value: -188.70 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -9)),  desc: 'Shopping Morumbi',        cat: 'Lazer',         value: -430.50 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -11)), desc: 'Freelance Produto',       cat: 'Receita',       value: 1800.00 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -12)), desc: 'Posto Ipiranga',          cat: 'Transporte',    value: -240.00 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -15)), desc: 'Aluguel',                 cat: 'Moradia',       value: -2200.00},
    { id: uid('tx'), date: formatDateBR(addDays(today, -17)), desc: 'Tesouro Direto',          cat: 'Investimentos', value: -500.00 },
    { id: uid('tx'), date: formatDateBR(addDays(today, -19)), desc: 'Bar do Alemão',           cat: 'Lazer',         value: -126.00 }
  ];

  return {
    isNewUser: true,
    balance: 0,
    exchange: {
      usd: 5.92, eur: 6.45, btc: 312450,
      trend: { usd: 0.4, eur: 0.2, btc: -1.2 }
    },
    // [FIX] Novos usuários começam com dados ZERADOS.
    // Dados de demonstração não devem aparecer no primeiro acesso real.
    cards: [],
    investments: [],
    fixedExpenses: [],
    budgets: {
      'Moradia': 2600, 'Alimentação': 1200, 'Transporte': 650,
      'Lazer': 800,    'Investimentos': 1300,'Assinaturas': 120,
      'Saúde': 450,    'Metas': 1600
    },
    goals: [],
    profile: {
      bannerImage: createDefaultBannerDataUrl(),
      avatarImage: createDefaultAvatarDataUrl('GrokFin User'),
      nickname: 'Navigator',
      displayName: 'GrokFin User',
      handle: '@grokfin.user'
    },
    transactions: [],
    ui: { txSearch: '', txCategory: 'all', txSort: 'date-desc', txDateStart: null, txDateEnd: null, txPage: 0, activeTab: 0 },
    chatHistory: [],
    lastUpdated: new Date().toISOString()
  };
}

// ── Tab index migration helpers ───────────────────────────────────────────────

// [FIX #5] Expandido para cobrir todas as 9 abas (0-8).
// Antes limitava erroneamente ao índice 5, bloqueando as tabs 6, 7 e 8
// de serem restauradas após recarregar a página.
function mapCurrentActiveTab(index) {
  const mapping = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 };
  return mapping[index] ?? Math.min(Math.max(index, 0), 8);
}

function mapLegacyActiveTab(index) {
  const mapping = { 0: 0, 1: 2, 2: 4, 3: 3, 4: 1 };
  return mapping[index] ?? Math.min(Math.max(index, 0), 8);
}

// ── loadState ─────────────────────────────────────────────────────────────────

export function loadState() {
  const seed = buildSeedState();
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const legacyRaw  = currentRaw ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = currentRaw || legacyRaw;
    if (!raw) return seed;

    const saved = JSON.parse(raw);
    const savedActiveTab = Number(saved?.ui?.activeTab);
    const activeTab = currentRaw
      ? mapCurrentActiveTab(Number.isFinite(savedActiveTab) ? savedActiveTab : seed.ui.activeTab)
      : mapLegacyActiveTab(Number.isFinite(savedActiveTab) ? savedActiveTab : seed.ui.activeTab);

    const goalsSource = Array.isArray(saved.goals) && saved.goals.length ? saved.goals : seed.goals;

    return {
      ...seed,
      ...saved,
      isNewUser: saved.isNewUser ?? (raw ? false : true),
      exchange:     { ...seed.exchange,     ...(saved.exchange    || {}), trend: { ...seed.exchange.trend, ...(saved.exchange?.trend || {}) } },
      ui:           { ...seed.ui,           ...(saved.ui          || {}), activeTab },
      budgets:      { ...seed.budgets,      ...(saved.budgets     || {}) },
      profile:      { ...seed.profile,      ...(saved.profile     || {}) },
      transactions: Array.isArray(saved.transactions) && saved.transactions.length ? saved.transactions : seed.transactions,
      cards:        Array.isArray(saved.cards)        ? saved.cards        : seed.cards,
      investments:  Array.isArray(saved.investments)  ? saved.investments  : seed.investments,
      fixedExpenses:Array.isArray(saved.fixedExpenses)? saved.fixedExpenses: seed.fixedExpenses,
      goals:        goalsSource,
      chatHistory:  Array.isArray(saved.chatHistory)  ? saved.chatHistory  : []
    };
  } catch {
    return seed;
  }
}

// ── saveState ─────────────────────────────────────────────────────────────────

// [FIX #2] Removido parâmetro `state` da assinatura. Todos os callers chamavam
// saveState() sem argumento, fazendo o parâmetro chegar como `undefined` e nunca
// persistindo nada no localStorage. Agora usa o `state` exportado deste módulo
// diretamente, que é o objeto mutado pela aplicação inteira.
export function saveState() {
  try {
    const toSave = { ...state, chatHistory: (state.chatHistory || []).slice(-40) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage cheio — tenta versão slim sem imagens e chat
    try {
      const slim = { ...state, chatHistory: [], profile: { ...state.profile, bannerImage: '', avatarImage: '' } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      console.warn('GrokFin: localStorage quase cheio, imagens de perfil removidas do cache.');
    } catch { /* ignore */ }
  }
}
