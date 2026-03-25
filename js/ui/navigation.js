/**
 * js/ui/navigation.js
 * Lógica de navegação: abas, sidebar, bottom sheet e painel 'Mais'.
 */

import { state, saveState } from '../state.js';
import { NAV_LABELS, NAV_ICONS, NAV_HASHES } from '../config.js';
import { clamp } from '../utils/math.js';
import { renderCards } from './cards-ui.js';

export function hashToTab(hash) {
  const clean = String(hash).replace(/^#/, '');
  const idx = NAV_HASHES.indexOf(clean);
  return idx >= 0 ? idx : 0;
}
import { renderCashflow } from './cashflow-ui.js';
import { renderInvestments, renderSimulator } from './investments-ui.js';
import { renderMarketTab } from './market-ui.js';

export function syncActiveViewLabel(index = 0) {
  // FIX: HTML uses id="current-view-chip" (combined icon+text pill)
  // Previous code targeted non-existent 'active-view-label' and 'active-view-icon' IDs.
  const chip = document.getElementById('current-view-chip');
  if (chip) {
    const icon = NAV_ICONS[index] || 'fa-house';
    const label = NAV_LABELS[index] || 'GrokFin';
    chip.innerHTML = `<i class="fa-solid ${icon} text-cyan-300"></i> ${label}`;
  }

  const dot = document.getElementById('mais-active-dot');
  const maisBtn = document.getElementById('mais-btn');
  // Tabs 5–9 não têm botão próprio → "Mais" deve ficar ativo para todas elas
  const isMoreTab = index >= 5 && index <= 9;
  if (dot && maisBtn) {
    if (isMoreTab) {
      dot.classList.remove('hidden');
      maisBtn.classList.add('active');
    } else {
      dot.classList.add('hidden');
      maisBtn.classList.remove('active');
    }
  }
}

export function syncLocationHash(index) {
  const hash = NAV_HASHES[clamp(Number(index) || 0, 0, NAV_HASHES.length - 1)];
  if (!hash) return;
  if (location.hash !== `#${hash}`) {
    history.replaceState(null, '', `#${hash}`);
  }
}

export function switchTab(index, { force = false, skipHistory = false } = {}) {
  const target = clamp(Number(index) || 0, 0, 9);
  if (!force && state.ui.activeTab === target) return;

  state.ui.activeTab = target;
  // [FIX #2] saveState() agora funciona sem argumento (usa o state do módulo)
  saveState();
  if (!skipHistory) syncLocationHash(target);

  // [FIX #1a] Ocultar todas as abas: a classe correta no HTML é 'tab-panel',
  // não 'app-view' como estava antes — causava as abas nunca ocultarem/exibirem.
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));

  // [FIX #1b] Exibir a aba destino: os IDs no HTML são 'tab-0', 'tab-1', etc.,
  // não 'view-home' ou 'view-0' como estava antes.
  const targetEl = document.getElementById(`tab-${target}`);
  if (targetEl) targetEl.classList.add('active');

  // Atualizar sidebar UI (Desktop)
  document.querySelectorAll('.sidebar-link, .nav-rail-button').forEach(link => {
    link.classList.toggle('active', parseInt(link.dataset.tab) === target);
  });

  // [FIX legacyIdx] Mapeamento corrigido: tabs 5-9 não têm botão próprio no bottom nav
  // → destacam o botão "Mais" (índice 5). Antes, tabs 5-8 incorretamente
  // destacavam "Metas" (4) ou "Análise" (1), desorientando o usuário mobile.
  const legacyIdx = { 0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:5, 7:5, 8:5, 9:5 }[target] ?? 0;
  document.querySelectorAll('.bottom-nav-button').forEach((btn, i) => {
    const icon = btn.querySelector('i');
    if (!icon) return;
    if (i === legacyIdx) {
      btn.classList.add('text-cyan-400');
      btn.classList.remove('text-white/40');
      icon.classList.remove('fa-beat-fade');
      void icon.offsetWidth;
      icon.classList.add('fa-beat-fade');
      setTimeout(() => icon.classList.remove('fa-beat-fade'), 800);
    } else {
      btn.classList.remove('text-cyan-400');
      btn.classList.add('text-white/40');
    }
  });

  syncActiveViewLabel(target);

  // Fechar o painel 'Mais' em telas menores, se aplicável
  const mwContainer = document.getElementById('main-workspace');
  if (mwContainer && window.innerWidth < 1024) mwContainer.scrollTo(0, 0);
  closeSidebar();
  
  // Tratar abas que exigem render no mount
  if (target === 6) requestAnimationFrame(renderCards);
  if (target === 7) requestAnimationFrame(renderCashflow);
  if (target === 8) { requestAnimationFrame(renderInvestments); requestAnimationFrame(renderSimulator); }
  if (target === 9) requestAnimationFrame(() => renderMarketTab(false));
}

export function openSidebar() {
  const o = document.getElementById('sidebar-overlay');
  if (o) o.classList.remove('hidden');
}

export function closeSidebar() {
  const o = document.getElementById('sidebar-overlay');
  if (o) o.classList.add('hidden');
}

export function openMaisSheet() {
  const sheet = document.getElementById('mais-sheet');
  const panel = document.getElementById('mais-sheet-panel');
  if (!sheet || !panel) return;
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => { panel.style.transform = 'translateY(0)'; });

  // Usar classe CSS em vez de inline style — evita conflito de especificidade
  // com .mais-tab-btn[data-tab].active definido em nav.css
  document.querySelectorAll('.mais-tab-btn').forEach(btn => {
    const t = Number(btn.dataset.tab);
    btn.classList.toggle('active', t === state.ui.activeTab);
    // Limpar inline styles residuais de versões anteriores
    btn.style.borderColor = '';
    btn.style.background  = '';
  });
}

export function closeMaisSheet() {
  const sheet = document.getElementById('mais-sheet');
  const panel = document.getElementById('mais-sheet-panel');
  if (!sheet || !panel) return;
  panel.style.transform = 'translateY(100%)';
  setTimeout(() => sheet.classList.add('hidden'), 290);
}

// ── Swipe-to-close no mais-sheet (padrão iOS/Android esperado pelo usuário) ──
export function bindMaisSheetSwipe() {
  const panel = document.getElementById('mais-sheet-panel');
  if (!panel) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  panel.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
    panel.style.transition = 'none'; // desativa transição durante drag
  }, { passive: true });

  panel.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const delta = Math.max(0, currentY - startY); // só deslizar para baixo
    panel.style.transform = `translateY(${delta}px)`;
  }, { passive: true });

  panel.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    panel.style.transition = ''; // restaura transição CSS
    const delta = currentY - startY;
    if (delta > 80) {
      closeMaisSheet(); // threshold de 80px para fechar
    } else {
      panel.style.transform = 'translateY(0)'; // snap back
    }
  });
}

export function bindNavigationEvents() {
  document.querySelectorAll('.sidebar-link, .nav-rail-button, .bottom-nav-button:not(#mais-btn)').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(parseInt(link.dataset.tab));
    });
  });

  window.addEventListener('hashchange', () => {
    const target = hashToTab(location.hash);
    if (target !== undefined) switchTab(target, { skipHistory: true });
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', openSidebar);
  document.getElementById('sidebar-close-btn')?.addEventListener('click', closeSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'sidebar-overlay') closeSidebar();
  });

  document.getElementById('mais-btn')?.addEventListener('click', openMaisSheet);
  document.getElementById('mais-sheet-close')?.addEventListener('click', closeMaisSheet);
  document.getElementById('mais-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'mais-sheet') closeMaisSheet();
  });
  
  document.querySelectorAll('.mais-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(Number(btn.dataset.tab));
      closeMaisSheet();
    });
  });

  // Ativar swipe-to-close no painel "Mais"
  bindMaisSheetSwipe();
}

// [FIX #3] Expor funções de navegação no escopo global (window).
// O app.html usa onclick inline nos botões do painel 'Mais' e no mais-btn
// (e.g. onclick="switchTab(6)", onclick="openMaisSheet()"). Como o código usa
// ES modules, essas funções não estão disponíveis no escopo global por padrão,
// causando ReferenceError ao clicar. Expor aqui resolve sem alterar o HTML.
window.switchTab    = switchTab;
window.openMaisSheet  = openMaisSheet;
window.closeMaisSheet = closeMaisSheet;
