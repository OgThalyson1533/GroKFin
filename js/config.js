/**
 * js/config.js — GrokFin Elite v6
 * Todas as constantes da aplicação centralizadas.
 * NÃO importa nenhum outro módulo interno.
 */

export const STORAGE_KEY = 'grokfin_hybrid_pwa_state';

/** Índice → label de cada aba */
export const NAV_LABELS = [
  'Home', 'Análise', 'Conta', 'Chat',
  'Metas', 'Perfil', 'Cartões', 'Fluxo', 'Invest.', 'Mercado'
];

/** Índice → hash de URL de cada aba */
export const NAV_HASHES = [
  'home', 'analise', 'conta', 'chat',
  'metas', 'perfil', 'cartoes', 'fluxo', 'investimentos', 'mercado'
];

/** Ícones FontAwesome de cada aba */
export const NAV_ICONS = [
  'fa-house', 'fa-chart-pie', 'fa-credit-card', 'fa-comments',
  'fa-bullseye', 'fa-user', 'fa-wallet', 'fa-water', 'fa-seedling', 'fa-globe'
];

/** Quantidade de transações por página no extrato */
export const TX_PAGE_SIZE = 20;

/** Lista canônica de categorias para orçamentos */
export const CATEGORIES_LIST = [
  'Alimentação', 'Assinaturas', 'Investimentos', 'Lazer',
  'Moradia', 'Metas', 'Rotina', 'Saúde', 'Transporte'
];

export const iconByCategory = {
  'Receita': 'fa-arrow-trend-up',
  'Alimentação': 'fa-bowl-food',
  'Transporte': 'fa-car-side',
  'Lazer': 'fa-film',
  'Moradia': 'fa-house',
  'Investimentos': 'fa-chart-line',
  'Assinaturas': 'fa-repeat',
  'Saúde': 'fa-heart-pulse',
  'Metas': 'fa-bullseye',
  'Rotina': 'fa-bag-shopping'
};

export const toneByCategory = {
  'Receita': 'tone-success',
  'Alimentação': 'tone-cyan',
  'Transporte': 'tone-amber',
  'Lazer': 'tone-violet',
  'Moradia': 'tone-slate',
  'Investimentos': 'tone-cyan',
  'Assinaturas': 'tone-violet',
  'Saúde': 'tone-danger',
  'Metas': 'tone-success',
  'Rotina': 'tone-slate'
};

export function iconForCategory(category) {
  return iconByCategory[category] || 'fa-wallet';
}

export function toneForCategory(category, positive = false) {
  if (positive) return 'tone-success';
  return toneByCategory[category] || 'tone-slate';
}

/**
 * Retorna lista de TODAS as categorias (padrão + customizadas do usuário)
 * Prioriza categorias customizadas quando há duplicata de nome
 * @param {Array} userCategories - Array de user_categories do state
 * @returns {Array} Lista de categorias ordenada [{name, icon, tone, isDefault, id?}]
 */
export function getAllCategories(userCategories = []) {
  // Categorias padrão do sistema
  const defaultCategories = CATEGORIES_LIST.map(name => ({
    name,
    icon: iconByCategory[name],
    tone: toneByCategory[name],
    isDefault: true
  }));
  
  // Categorias customizadas do usuário
  const customCategories = (userCategories || []).map(cat => ({
    name: cat.name,
    icon: cat.icon,
    tone: cat.color_tone,
    isDefault: false,
    id: cat.id
  }));
  
  // Mescla evitando duplicatas (prioriza customizadas)
  const names = new Set();
  const merged = [];
  
  // Adiciona customizadas primeiro
  for (const cat of customCategories) {
    const lowerName = cat.name.toLowerCase();
    if (!names.has(lowerName)) {
      names.add(lowerName);
      merged.push(cat);
    }
  }
  
  // Depois adiciona padrões que não estão como customizadas
  for (const cat of defaultCategories) {
    const lowerName = cat.name.toLowerCase();
    if (!names.has(lowerName)) {
      names.add(lowerName);
      merged.push(cat);
    }
  }
  
  // Ordena alfabeticamente
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}
