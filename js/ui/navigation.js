/**
 * js/ui/navigation.js
 * Lógica de navegação: abas, sidebar, bottom sheet e painel 'Mais'.
 */

import { state, saveState } from '../state.js';
import { NAV_LABELS, NAV_ICONS, NAV_HASHES } from '../config.js';
import { mapCurrentActiveTab, mapLegacyActiveTab, hashToTab, clamp } from '../utils/dom.js';
import { renderCards } from './cards-ui.js';
import { renderCashflow } from './cashflow-ui.js';
import { renderInvestments, renderSimulator } from './investments-ui.js';

export function syncActiveViewLabel(index = 0) {
  const lbl = document.getElementById('active-view-label');
  const icon = document.getElementById('active-view-icon');
  if (lbl) lbl.textContent = NAV_LABELS[index] || 'GrokFin';
  if (icon) icon.className = `fa-solid ${NAV_ICONS[index] || 'fa-house'} text-cyan-400 mr-2`;

  const dot = document.getElementById('mais-active-dot');
  const maisBtn = document.getElementById('mais-btn');
  const isMoreTab = index >= 6 && index <= 8;
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
  const target = clamp(Number(index) || 0, 0, 8);
  if (!force && state.ui.activeTab === target) return;

  state.ui.activeTab = target;
  saveState();
  if (!skipHistory) syncLocationHash(target);

  // Ocultar todas as abas
  document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));

  // Exibir a aba destino e rodar hooks
  const targetEl = document.getElementById(`view-${NAV_HASHES[target]}`) ||
                   document.getElementById(`view-${target}`);
  if (targetEl) targetEl.classList.add('active');

  // Atualizar sidebar UI (Desktop)
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', parseInt(link.dataset.tab) === target);
  });

  // Atualizar bottom nav (Mobile)
  const legacyIdx = mapLegacyActiveTab(target);
  document.querySelectorAll('.bottom-nav-btn').forEach((btn, i) => {
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
  
  document.querySelectorAll('.mais-tab-btn').forEach(btn => {
    const t = Number(btn.dataset.tab);
    btn.style.borderColor = t === state.ui.activeTab ? 'rgba(0,245,255,.3)' : '';
    btn.style.background = t === state.ui.activeTab ? 'rgba(0,245,255,.08)' : '';
  });
}

export function closeMaisSheet() {
  const sheet = document.getElementById('mais-sheet');
  const panel = document.getElementById('mais-sheet-panel');
  if (!sheet || !panel) return;
  panel.style.transform = 'translateY(100%)';
  setTimeout(() => sheet.classList.add('hidden'), 290);
}

export function bindNavigationEvents() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
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
}
