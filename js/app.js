/**
 * js/app.js — GrokFin Elite v6
 * Orquestrador central da aplicação modular.
 */

import { loadState, state } from './state.js';
import { initAuth } from './services/auth.js';
import { isSupabaseConfigured } from './services/supabase.js';
import { bindNavigationEvents, syncLocationHash, syncActiveViewLabel, switchTab } from './ui/navigation.js';
import { bindDashboardEvents, renderDashboard } from './ui/dashboard-ui.js';
import { renderCharts } from './ui/charts.js';
import { bindTxEvents, renderTransactions } from './ui/transactions-ui.js';
import { bindGoalEvents, renderGoals } from './ui/goals-ui.js';
import { bindCardEvents, renderCards } from './ui/cards-ui.js';
import { bindCashflowEvents, renderCashflow } from './ui/cashflow-ui.js';
import { bindInvestmentEvents, renderInvestments } from './ui/investments-ui.js';
import { bindChatEvents } from './ui/chat-ui.js';
import { bindProfileEvents, renderProfile } from './ui/profile-ui.js';
import { calculateAnalytics } from './analytics/engine.js';
import { showToast } from './utils/dom.js';

window.renderAll = function() {
  const analytics = calculateAnalytics(state);
  
  renderProfile(analytics);
  renderDashboard(analytics);
  renderCharts(analytics);
  renderTransactions();
  renderGoals();
  renderCards();
  renderCashflow();
  renderInvestments();
}

async function initApp() {
  // 0. Autenticação restrita (bloquear se Supabase estiver configurado e o usuário não existir)
  const user = await initAuth();
  if (isSupabaseConfigured && !user) {
    window.location.replace('./index.html');
    return;
  }

  // 1. Carrega dados do localStorage ou gera banco inicial
  const loadedState = loadState();
  Object.assign(state, loadedState);

  // 2. Configura a Chart.js global
  if (window.Chart) {
    Chart.defaults.color = 'rgba(255,255,255,.58)';
    Chart.defaults.font.family = 'Inter';
  }

  // 3. Aplica bind de eventos de todos os módulos de UI
  bindNavigationEvents();
  bindDashboardEvents();
  bindTxEvents();
  bindGoalEvents();
  bindCardEvents();
  bindCashflowEvents();
  bindInvestmentEvents();
  bindChatEvents();
  bindProfileEvents();

  // 4. Render Inicial Pleno
  window.renderAll();
  
  // 5. Restaura a Tab ativa 
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash) {
     window.dispatchEvent(new Event('hashchange'));
  } else {
     switchTab(state.ui.activeTab || 0, { noScroll: true, skipHistory: true });
     syncLocationHash(state.ui.activeTab || 0);
     syncActiveViewLabel(state.ui.activeTab || 0);
  }

  console.info('[GrokFin] Aplicação inicializada de forma modular.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
