/**
 * js/ui/goals-ui.js
 * Lógica de metas, temas, aportes e modais.
 */

import { state, saveState } from '../state.js';
import { uid } from '../utils/math.js';
import { formatMoney, formatPercent, escapeHtml, richText, parseCurrencyInput } from '../utils/format.js';
import { addMonths, formatDateBR } from '../utils/date.js';
import { getGoalProgress, getMonthlyNeed } from '../analytics/engine.js';
import { showToast, normalizeText } from '../utils/dom.js';

/* --- Goal Themes Catalog --- */
export const GOAL_THEME_CATALOG = {
  generic: { label: 'Objetivo', img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop' },
  home: { label: 'Casa', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop' },
  travel: { label: 'Viagem', img: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1200&auto=format&fit=crop' },
  vehicle: { label: 'Veículo', img: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200&auto=format&fit=crop' },
  reserve: { label: 'Reserva', img: 'https://images.unsplash.com/photo-1616432043562-3671ea2e5242?q=80&w=1200&auto=format&fit=crop' },
  game: { label: 'Games', img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop' },
  tech: { label: 'Tecnologia', img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop' },
  education: { label: 'Educação', img: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1200&auto=format&fit=crop' },
  celebration: { label: 'Celebração', img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop' },
  bike: { label: 'Mobilidade', img: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?q=80&w=1200&auto=format&fit=crop' }
};

export const GOAL_THEME_RULES = [
  { theme: 'game', keys: ['videogame', 'video game', 'video-game', 'game', 'gamer', 'console', 'ps5', 'playstation', 'xbox', 'nintendo', 'switch'] },
  { theme: 'home', keys: ['casa', 'imovel', 'imóvel', 'apto', 'apartamento', 'condominio', 'condomínio'] },
  { theme: 'travel', keys: ['japao', 'japão', 'viagem', 'praia', 'rio', 'fortaleza', 'europa', 'ferias', 'férias', 'intercambio', 'intercâmbio'] },
  { theme: 'vehicle', keys: ['carro', 'moto', 'veiculo', 'veículo'] },
  { theme: 'reserve', keys: ['reserva', 'emergencia', 'emergência', 'seguranca', 'segurança'] },
  { theme: 'tech', keys: ['pc', 'notebook', 'setup', 'studio', 'escritorio', 'escritório', 'macbook', 'iphone', 'celular', 'tablet', 'camera', 'câmera'] },
  { theme: 'education', keys: ['faculdade', 'curso', 'mba', 'pos', 'pós', 'idioma', 'certificacao', 'certificação', 'estudo', 'educacao', 'educação'] },
  { theme: 'celebration', keys: ['casamento', 'festa', 'aniversario', 'aniversário', 'lua de mel', 'evento'] },
  { theme: 'bike', keys: ['bike', 'bicicleta', 'ciclismo'] }
];

export function detectGoalTheme(name = '', explicitTheme = 'auto') {
  if (explicitTheme && explicitTheme !== 'auto' && GOAL_THEME_CATALOG[explicitTheme]) {
    return explicitTheme;
  }
  const normalized = normalizeText(name);
  const rule = GOAL_THEME_RULES.find(item => item.keys.some(key => normalized.includes(normalizeText(key))));
  return rule?.theme || 'generic';
}

export function getGoalThemeLabel(theme = 'generic') {
  return GOAL_THEME_CATALOG[theme]?.label || GOAL_THEME_CATALOG.generic.label;
}

export function pickGoalImage(name, explicitTheme = 'auto') {
  const theme = detectGoalTheme(name, explicitTheme);
  return GOAL_THEME_CATALOG[theme]?.img || GOAL_THEME_CATALOG.generic.img;
}

export function estimateGoalTarget(name, explicitTheme = 'auto') {
  const theme = detectGoalTheme(name, explicitTheme);
  const map = { reserve: 30000, home: 90000, vehicle: 65000, travel: 18000, game: 4500, tech: 9000, education: 15000, celebration: 20000, bike: 6500 };
  return map[theme] || 18000;
}

export function estimateGoalDeadline(name, explicitTheme = 'auto') {
  const normalized = normalizeText(name);
  const explicitYear = normalized.match(/20\d{2}/);
  if (explicitYear) return new Date(Number(explicitYear[0]), 11, 1).toISOString();
  const theme = detectGoalTheme(name, explicitTheme);
  const mapMonths = { reserve: 6, travel: 12, home: 24, vehicle: 18, education: 14 };
  return addMonths(new Date(), mapMonths[theme] || 10).toISOString();
}

export function formatMonthYear(dateIso) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(dateIso));
}

let _editingGoalId = null;
let _goalToDelete = null;

export function renderGoals(analytics) {
  const goalsContainer = document.getElementById('goals-container');
  const overviewContainer = document.getElementById('goals-overview');
  if (!goalsContainer || !overviewContainer) return;

  const totalSaved = state.goals.reduce((acc, goal) => acc + goal.atual, 0);
  const avgProgress = analytics.goalsProgress || 0;
  const monthlyNeedTotal = state.goals.reduce((acc, goal) => acc + getMonthlyNeed(goal), 0);

  overviewContainer.innerHTML = `
    <div class="glass-panel rounded-3xl p-5">
      <p class="text-xs font-bold uppercase tracking-[.18em] text-white/32">Guardado em metas</p>
      <p class="mt-3 text-3xl font-black text-white">${formatMoney(totalSaved)}</p>
    </div>
    <div class="glass-panel rounded-3xl p-5">
      <p class="text-xs font-bold uppercase tracking-[.18em] text-white/32">Aporte mensal sugerido</p>
      <p class="mt-3 text-3xl font-black text-cyan-200">${formatMoney(monthlyNeedTotal)}</p>
    </div>
    <div class="glass-panel rounded-3xl p-5">
      <p class="text-xs font-bold uppercase tracking-[.18em] text-white/32">Progresso médio</p>
      <p class="mt-3 text-3xl font-black text-emerald-300">${formatPercent(avgProgress, 0)}</p>
    </div>
  `;

  goalsContainer.innerHTML = state.goals.length
    ? state.goals.map(goal => {
        const progress = getGoalProgress(goal);
        const monthlyNeed = getMonthlyNeed(goal);
        const remaining = Math.max(0, goal.total - goal.atual);
        const contribution = Math.max(0, Math.min(monthlyNeed || remaining, remaining, Math.max(state.balance - 800, 0) || Math.min(state.balance, remaining)));
        const statusClass = progress >= 80 ? 'status-up' : progress >= 45 ? 'status-neutral' : 'status-down';
        const theme = detectGoalTheme(goal.nome, goal.theme || 'auto');
        const themeLabel = getGoalThemeLabel(theme);
        const goalImage = goal.customImage || pickGoalImage(goal.nome, goal.theme || theme);

        return `
          <article class="goal-card group glass-panel card-hover relative isolate min-h-[22rem] overflow-hidden rounded-[30px] p-6">
            <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style="background-image:url('${goalImage}')"></div>
            <div class="relative z-10 flex h-full flex-col justify-between">
              <div class="flex items-start justify-between gap-3">
                <div class="flex flex-wrap gap-2">
                  <span class="pill ${statusClass}">${progress}% concluída</span>
                  <span class="pill tone-slate"><i class="fa-solid fa-image text-cyan-300"></i> ${escapeHtml(themeLabel)}</span>
                </div>
                <span class="pill">${escapeHtml(formatMonthYear(goal.deadline))}</span>
              </div>

              <div class="space-y-5">
                <div>
                  <h4 class="text-2xl font-black text-white">${escapeHtml(goal.nome)}</h4>
                  <p class="mt-2 text-sm text-white/70">Meta alvo ${formatMoney(goal.total)} • faltam ${formatMoney(remaining)}</p>
                </div>

                <div>
                  <div class="mb-2 flex items-center justify-between text-sm">
                    <span class="text-white/65">${formatMoney(goal.atual)} guardados</span>
                    <strong class="text-white">${progress}%</strong>
                  </div>
                  <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p class="text-xs uppercase tracking-[.18em] text-white/34">Aporte ideal</p>
                    <p class="mt-2 text-lg font-bold text-cyan-200">${formatMoney(monthlyNeed)}</p>
                  </div>
                  <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p class="text-xs uppercase tracking-[.18em] text-white/34">Prazo</p>
                    <p class="mt-2 text-lg font-bold text-white">${escapeHtml(formatMonthYear(goal.deadline))}</p>
                  </div>
                </div>

                <div class="flex flex-wrap gap-3">
                  <button data-goal-contribute="${goal.id}" data-amount="${contribution}" class="rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-3 text-sm font-bold text-black shadow-brand ${contribution > 0 ? '' : 'pointer-events-none opacity-50'}">
                    ${contribution > 0 ? `Aportar ${formatMoney(contribution)}` : 'Concluída'}
                  </button>
                  <button data-goal-brief="${goal.id}" class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/16">
                    Ler com IA
                  </button>
                  <button onclick="openEditGoal('${goal.id}')" class="w-10 h-10 flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 transition-colors" title="Editar meta">
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                  <button onclick="confirmDeleteGoal('${goal.id}')" class="w-10 h-10 flex items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-400 hover:bg-rose-400/20 transition-colors" title="Excluir meta">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          </article>
        `;
      }).join('')
    : `
      <div class="glass-panel col-span-full rounded-[28px] p-10 text-center text-white/55">
        Ainda não existem metas cadastradas.
      </div>
    `;
}

export function createSmartGoal() {
  const nameInput = document.getElementById('goal-input');
  const targetInput = document.getElementById('goal-target');
  const themeInput = document.getElementById('goal-theme');
  const name = nameInput?.value.trim();

  if (!name) {
    nameInput?.focus();
    showToast('Descreva a meta antes de gerar.', 'danger');
    return;
  }

  const selectedTheme = themeInput?.value || 'auto';
  const resolvedTheme = detectGoalTheme(name, selectedTheme);
  const target = parseCurrencyInput(targetInput?.value);

  const goal = {
    id: uid('goal'),
    nome: name,
    atual: 0,
    total: target || estimateGoalTarget(name, selectedTheme),
    theme: resolvedTheme,
    img: pickGoalImage(name, selectedTheme),
    deadline: estimateGoalDeadline(name, selectedTheme)
  };

  state.goals.unshift(goal);
  saveState();
  
  if (nameInput) nameInput.value = '';
  if (targetInput) targetInput.value = '';
  if (themeInput) themeInput.value = 'auto';
  showToast(`Meta ${goal.nome} criada com tema ${getGoalThemeLabel(resolvedTheme).toLowerCase()}.`, 'success');
  
  if (window.appRenderAll) window.appRenderAll();
}

export function applyGoalContribution(goalId, amount, options = {}) {
  const goal = state.goals.find(item => item.id === goalId);
  if (!goal) return { ok: false, message: 'Meta não encontrada.' };

  const remaining = Math.max(0, goal.total - goal.atual);
  if (remaining <= 0) return { ok: false, message: 'Já concluída.' };

  const liquidAvailable = state.balance > 1500 ? state.balance - 800 : state.balance;
  const applied = Math.min(Number(amount) || getMonthlyNeed(goal), remaining, liquidAvailable);
  
  if (applied <= 0) return { ok: false, message: 'Saldo insuficiente.' };

  goal.atual = Number((goal.atual + applied).toFixed(2));
  state.balance = Number((state.balance - applied).toFixed(2));
  state.transactions.unshift({
    id: uid('tx'),
    date: formatDateBR(new Date()),
    desc: `Aporte meta: ${goal.nome}`,
    cat: 'Metas',
    value: -applied
  });
  
  saveState();
  if (options.notify !== false) showToast(`Aporte de ${formatMoney(applied)} aplicado.`, 'success');
  if (window.appRenderAll) window.appRenderAll();

  return { ok: true, message: `Apliquei ${formatMoney(applied)} em ${goal.nome}.` };
}

export function openEditGoal(id) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  _editingGoalId = id;
  
  document.getElementById('goal-modal-title').textContent = 'Editar Meta';
  document.getElementById('goal-modal-name').value = goal.nome;
  document.getElementById('goal-modal-target').value = goal.total.toFixed(2).replace('.', ',');
  document.getElementById('goal-modal-current').value = goal.atual.toFixed(2).replace('.', ',');
  
  const d = new Date(goal.deadline);
  document.getElementById('goal-modal-deadline').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  document.getElementById('goal-modal-customimg').value = goal.customImage || '';
  document.getElementById('goal-modal-error')?.classList.add('hidden');
  document.getElementById('goal-modal-overlay')?.classList.remove('hidden');
}

export function confirmDeleteGoal(id) {
  _goalToDelete = id;
  document.getElementById('goal-delete-overlay')?.classList.remove('hidden');
}

export function deleteGoal() {
  if (!_goalToDelete) return;
  const goal = state.goals.find(g => g.id === _goalToDelete);
  if (goal) {
    state.balance += goal.atual; // Devolve o valor guardado para o caixa global
    state.transactions.unshift({
      id: uid('tx'),
      date: formatDateBR(new Date()),
      desc: `Resgate meta: ${goal.nome}`,
      cat: 'Metas',
      value: goal.atual
    });
  }
  state.goals = state.goals.filter(g => g.id !== _goalToDelete);
  _goalToDelete = null;
  saveState();
  document.getElementById('goal-delete-overlay')?.classList.add('hidden');
  showToast('Meta excluída e valor devolvido.', 'info');
  if (window.appRenderAll) window.appRenderAll();
}

export function saveGoalModal() {
  const name = document.getElementById('goal-modal-name').value.trim();
  const target = parseCurrencyInput(document.getElementById('goal-modal-target').value);
  const current = parseCurrencyInput(document.getElementById('goal-modal-current').value) || 0;
  const deadlineStr = document.getElementById('goal-modal-deadline').value;
  const customImg = document.getElementById('goal-modal-customimg').value.trim();
  const errEl = document.getElementById('goal-modal-error');

  if (!name || !target || !deadlineStr) {
    errEl.textContent = 'Preencha nome, alvo e prazo.';
    errEl.classList.remove('hidden');
    return;
  }

  const deadline = new Date(deadlineStr + 'T12:00:00Z').toISOString();

  if (_editingGoalId) {
    const idx = state.goals.findIndex(g => g.id === _editingGoalId);
    if (idx >= 0) {
      const g = state.goals[idx];
      const diff = current - g.atual;
      if (diff > 0 && state.balance < diff) {
        errEl.textContent = 'Saldo insuficiente para atualizar o valor guardado.';
        errEl.classList.remove('hidden');
        return;
      }
      state.balance -= diff;
      
      state.goals[idx] = { 
        ...g, nome: name, total: target, atual: current, deadline, 
        customImage: customImg || undefined,
        theme: detectGoalTheme(name, g.theme)
      };
      
      // se mudou imagem, recarrega a imagem padrão baseada no tema
      if (!customImg) state.goals[idx].img = pickGoalImage(name, state.goals[idx].theme);
      else state.goals[idx].img = customImg;
      
      saveState();
      showToast('Meta atualizada com sucesso.', 'success');
    }
  }
  
  document.getElementById('goal-modal-overlay')?.classList.add('hidden');
  if (window.appRenderAll) window.appRenderAll();
}

export function bindGoalEvents() {
  document.getElementById('goal-generate-btn')?.addEventListener('click', createSmartGoal);
  document.getElementById('goal-modal-cancel')?.addEventListener('click', () => document.getElementById('goal-modal-overlay')?.classList.add('hidden'));
  document.getElementById('goal-modal-close')?.addEventListener('click', () => document.getElementById('goal-modal-overlay')?.classList.add('hidden'));
  document.getElementById('goal-modal-save')?.addEventListener('click', saveGoalModal);
  
  document.getElementById('goal-delete-cancel')?.addEventListener('click', () => document.getElementById('goal-delete-overlay')?.classList.add('hidden'));
  document.getElementById('goal-delete-confirm')?.addEventListener('click', deleteGoal);

  // Delegate contribution/brief events
  document.getElementById('goals-container')?.addEventListener('click', e => {
    const contBtn = e.target.closest('[data-goal-contribute]');
    if (contBtn) {
      applyGoalContribution(contBtn.dataset.goalContribute, Number(contBtn.dataset.amount));
    }
    const briefBtn = e.target.closest('[data-goal-brief]');
    if (briefBtn && window.switchTab && window.sendChatPrompt) {
      const g = state.goals.find(x => x.id === briefBtn.dataset.goalBrief);
      if (g) {
        window.switchTab(3);
        window.sendChatPrompt(`Resuma o plano para a meta "${g.nome}". O que devo fazer este mês?`);
      }
    }
  });

  window.openEditGoal = openEditGoal;
  window.confirmDeleteGoal = confirmDeleteGoal;
}
