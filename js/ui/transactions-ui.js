/**
 * js/ui/transactions-ui.js
 * Tratamento de lista de transações, filtros, paginação e modal de CRUD.
 */

import { state, saveState } from '../state.js';
import { formatMoney, escapeHtml, parseCurrencyInput } from '../utils/format.js';
import { toneForCategory, iconForCategory } from '../config.js';
import { uid } from '../utils/math.js';
import { parseDateBR } from '../utils/date.js';
import { showToast, normalizeText } from '../utils/dom.js';

let _editingTxId = null;
let _txToDelete = null;

export const TX_PAGE_SIZE = 20;

export function getFilteredTransactions() {
  let list = [...state.transactions];
  const search = normalizeText(state.ui.txSearch || '');

  if (search) {
    list = list.filter(item => normalizeText(`${item.desc} ${item.cat} ${item.date}`).includes(search));
  }

  if (state.ui.txCategory !== 'all') {
    list = list.filter(item => item.cat === state.ui.txCategory);
  }

  if (state.ui.txDateStart) {
    const start = new Date(state.ui.txDateStart);
    start.setHours(0, 0, 0, 0);
    list = list.filter(item => parseDateBR(item.date) >= start);
  }
  if (state.ui.txDateEnd) {
    const end = new Date(state.ui.txDateEnd);
    end.setHours(23, 59, 59, 999);
    list = list.filter(item => parseDateBR(item.date) <= end);
  }

  switch (state.ui.txSort) {
    case 'date-asc':
      list.sort((a, b) => parseDateBR(a.date) - parseDateBR(b.date));
      break;
    case 'value-desc':
      list.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      break;
    case 'value-asc':
      list.sort((a, b) => Math.abs(a.value) - Math.abs(b.value));
      break;
    default:
      list.sort((a, b) => parseDateBR(b.date) - parseDateBR(a.date));
  }
  return list;
}

export function renderTransactionFilters() {
  const txSearch = document.getElementById('tx-search');
  const txCategory = document.getElementById('tx-category');
  const txSort = document.getElementById('tx-sort');
  if (!txSearch || !txCategory || !txSort) return;

  txSearch.value = state.ui.txSearch;
  txSort.value = state.ui.txSort;

  let activeFilters = 0;
  if (state.ui.txSearch) activeFilters++;
  if (state.ui.txCategory !== 'all') activeFilters++;
  if (state.ui.txDateStart) activeFilters++;
  const badge = document.getElementById('tx-filter-badge');
  if (badge) {
    if (activeFilters > 0) {
      badge.textContent = activeFilters;
      badge.classList.remove('hidden');
      badge.classList.add('inline-flex');
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('inline-flex');
    }
  }

  const categories = [...new Set(state.transactions.map(item => item.cat))].sort((a, b) => a.localeCompare(b));
  if (!categories.includes(state.ui.txCategory)) {
    state.ui.txCategory = 'all';
  }

  txCategory.innerHTML = `
    <option value="all">Todas as categorias</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}
  `;
  txCategory.value = state.ui.txCategory;
}

export function loadMoreTransactions() {
  state.ui.txPage = (state.ui.txPage || 0) + 1;
  renderTransactions();
}

export function renderTransactions() {
  renderTransactionFilters();
  const body = document.getElementById('transactions-body');
  if (!body) return;

  const fullList = getFilteredTransactions();
  const page = state.ui.txPage || 0;
  const list = fullList.slice(0, (page + 1) * TX_PAGE_SIZE);
  const incomeTotal = fullList.filter(item => item.value > 0).reduce((acc, item) => acc + item.value, 0);
  const expenseTotal = fullList.filter(item => item.value < 0).reduce((acc, item) => acc + Math.abs(item.value), 0);
  const avgVisible = fullList.length ? fullList.reduce((acc, item) => acc + Math.abs(item.value), 0) / fullList.length : 0;

  if (document.getElementById('tx-count')) document.getElementById('tx-count').textContent = fullList.length;
  if (document.getElementById('tx-expense-total')) document.getElementById('tx-expense-total').textContent = formatMoney(expenseTotal);
  if (document.getElementById('tx-income-total')) document.getElementById('tx-income-total').textContent = formatMoney(incomeTotal);
  if (document.getElementById('tx-average-total')) document.getElementById('tx-average-total').textContent = formatMoney(avgVisible);

  if (!fullList.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-16 text-center">
          <div class="flex flex-col items-center gap-3">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)">
              <i class="fa-solid fa-magnifying-glass text-white/30 text-xl"></i>
            </div>
            <p class="text-white/45 font-medium">Nenhuma transação encontrada</p>
            <p class="text-white/28 text-sm">Ajuste os filtros ou adicione uma nova transação</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = list.map(item => {
    const positive = item.value > 0;
    const tone = toneForCategory(item.cat, positive);
    return `
      <tr class="hover:bg-white/[0.02] group">
        <td class="px-6 py-5 text-white/55">${escapeHtml(item.date)}</td>
        <td class="px-6 py-5">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-2xl ${tone}">
              <i class="fa-solid ${iconForCategory(item.cat)} text-sm"></i>
            </span>
            <div>
              <p class="font-semibold text-white">${escapeHtml(item.desc)}</p>
              <p class="text-xs text-white/40 flex flex-wrap items-center gap-1">
                ${positive ? 'Entrada identificada' : 'Saída categorizada'}
                ${item.recurringTemplate ? '<span class="recurring-badge rounded-full px-2 py-0.5 text-[10px] font-bold">↺ Recorrente</span>' : ''}
                ${(item.payment === 'cartao_credito' || item.payment === 'cartao_debito') && item.cardId ? (() => { const c = (state.cards||[]).find(x=>x.id===item.cardId); return c ? `<span class="payment-badge-card rounded-full px-2 py-0.5 text-[10px] font-bold"><i class="fa-solid ${item.payment === 'cartao_debito' ? 'fa-credit-card' : 'fa-credit-card'} mr-0.5"></i>${escapeHtml(c.name)} (${item.payment === 'cartao_credito' ? 'Cred.' : 'Déb.'})</span>` : ''; })() : ''}
                ${item.payment === 'pix' ? '<span class="payment-badge-pix rounded-full px-2 py-0.5 text-[10px] font-bold">Pix</span>' : ''}
                ${item.payment === 'dinheiro' ? '<span class="payment-badge-dinheiro rounded-full px-2 py-0.5 text-[10px] font-bold">Dinheiro</span>' : ''}
              </p>
            </div>
          </div>
        </td>
        <td class="px-6 py-5">
          <span class="inline-flex rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">${escapeHtml(item.cat)}</span>
        </td>
        <td class="px-6 py-5 text-right font-bold ${positive ? 'text-emerald-300' : 'text-white'}">
          ${positive ? '+' : '-'}${formatMoney(Math.abs(item.value))}
        </td>
        <td class="px-6 py-5">
          <div class="flex items-center justify-center gap-2">
            <button onclick="openEditTx('${item.id}')" title="Editar"
              class="w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-400/70 hover:bg-cyan-400/10 hover:border-cyan-400/30 hover:text-cyan-300 transition-all">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="confirmDeleteTx('${item.id}')" title="Excluir"
              class="w-8 h-8 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-rose-400/60 hover:bg-rose-400/10 hover:border-rose-400/30 hover:text-rose-300 transition-all">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const existing = document.getElementById('tx-load-more');
  if (existing) existing.remove();
  if (fullList.length > list.length) {
    const remaining = fullList.length - list.length;
    const btn = document.createElement('tr');
    btn.id = 'tx-load-more';
    btn.innerHTML = `<td colspan="6" class="px-6 py-5 text-center">
      <button onclick="loadMoreTransactions()" class="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-cyan-300 hover:bg-white/10 transition-colors">
        <i class="fa-solid fa-chevron-down mr-2"></i>Carregar mais ${remaining > TX_PAGE_SIZE ? TX_PAGE_SIZE : remaining} de ${remaining} restantes
      </button>
    </td>`;
    body.appendChild(btn);
  }
}

export function openTxModal() {
  _editingTxId = null;
  document.getElementById('tx-modal-title').textContent = 'Nova Transação';
  const fields = ['desc', 'value', 'date', 'split'];
  fields.forEach(f => {
    const el = document.getElementById(`tx-modal-${f}`);
    if (el) el.value = '';
  });
  
  const bdDate = document.getElementById('tx-modal-date');
  if (bdDate) bdDate.value = new Date().toLocaleDateString('pt-BR');
  
  const incRadio = document.getElementById('tx-type-income');
  if (incRadio) incRadio.checked = true;
  
  const recCheck = document.getElementById('tx-modal-recurring');
  if (recCheck) recCheck.checked = false;

  const payment = document.getElementById('tx-modal-payment');
  if (payment) payment.value = 'conta';
  
  const cardRow = document.getElementById('tx-card-selector-row');
  if (cardRow) cardRow.classList.add('hidden');

  const errEl = document.getElementById('tx-modal-error');
  if (errEl) errEl.classList.add('hidden');

  document.getElementById('tx-modal-overlay')?.classList.remove('hidden');
  setTimeout(() => document.getElementById('tx-modal-desc')?.focus(), 60);
}

export function openEditTx(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  _editingTxId = id;

  document.getElementById('tx-modal-title').textContent = 'Editar Transação';
  document.getElementById('tx-modal-desc').value = tx.desc;
  document.getElementById('tx-modal-cat').value = tx.cat;
  document.getElementById('tx-modal-date').value = tx.date;
  document.getElementById('tx-modal-value').value = Math.abs(tx.value).toFixed(2).replace('.', ',');
  document.getElementById('tx-modal-split').value = tx.installments > 1 ? tx.installments : '';
  
  const payment = document.getElementById('tx-modal-payment');
  if (payment) payment.value = tx.payment || 'conta';
  
  const isIncome = tx.value > 0;
  const incRadio = document.getElementById('tx-type-income');
  const expRadio = document.getElementById('tx-type-expense');
  if (isIncome && incRadio) incRadio.checked = true;
  else if (!isIncome && expRadio) expRadio.checked = true;

  const recCheck = document.getElementById('tx-modal-recurring');
  if (recCheck) recCheck.checked = !!tx.recurringTemplate;

  document.getElementById('tx-modal-error')?.classList.add('hidden');
  document.getElementById('tx-modal-overlay')?.classList.remove('hidden');

  if (tx.cardId && (payment.value === 'cartao_credito' || payment.value === 'cartao_debito')) {
    const cardModal = document.getElementById('tx-modal-card');
    if (cardModal) cardModal.value = tx.cardId;
    document.getElementById('tx-card-selector-row')?.classList.remove('hidden');
  } else {
    document.getElementById('tx-card-selector-row')?.classList.add('hidden');
  }
}

export function confirmDeleteTx(id) {
  _txToDelete = id;
  document.getElementById('tx-delete-overlay')?.classList.remove('hidden');
}

export function deleteTx() {
  if (!_txToDelete) return;
  const oldVal = state.transactions.find(t => t.id === _txToDelete)?.value || 0;
  state.transactions = state.transactions.filter(t => t.id !== _txToDelete);
  state.balance -= oldVal;
  _txToDelete = null;
  saveState();
  document.getElementById('tx-delete-overlay')?.classList.add('hidden');
  renderTransactions();
  showToast('Transação excluída.', 'info');
  // Re-render app areas normally synced via switchTab
  if (window.appRenderAll) window.appRenderAll();
}

export function saveTxModal() {
  const desc = document.getElementById('tx-modal-desc').value.trim();
  const cat = document.getElementById('tx-modal-cat').value;
  const dateStr = document.getElementById('tx-modal-date').value.trim();
  const rawValue = parseCurrencyInput(document.getElementById('tx-modal-value').value);
  const isIncome = document.getElementById('tx-type-income').checked;
  const payment = document.getElementById('tx-modal-payment').value;
  const cardId = document.getElementById('tx-modal-card')?.value;
  const isRecurring = document.getElementById('tx-modal-recurring')?.checked;
  const splitInput = document.getElementById('tx-modal-split').value;
  const installments = parseInt(splitInput) || 1;

  const errEl = document.getElementById('tx-modal-error');

  if (!desc) { errEl.textContent = 'A descrição é obrigatória.'; errEl.classList.remove('hidden'); return; }
  if (!dateStr || dateStr.length < 8) { errEl.textContent = 'Use o formato DD/MM/AAAA.'; errEl.classList.remove('hidden'); return; }
  if (!rawValue) { errEl.textContent = 'O valor informado é inválido.'; errEl.classList.remove('hidden'); return; }
  
  if ((payment === 'cartao_credito' || payment === 'cartao_debito') && (!cardId || cardId === '')) {
    errEl.textContent = 'Selecione em qual cartão foi lançado.'; errEl.classList.remove('hidden'); return;
  }

  const finalValue = isIncome ? rawValue : -rawValue;
  const installValue = Number((finalValue / installments).toFixed(2));

  if (_editingTxId) {
    const idx = state.transactions.findIndex(t => t.id === _editingTxId);
    if (idx >= 0) {
      const diff = finalValue - state.transactions[idx].value;
      state.balance += diff;
      state.transactions[idx] = { 
        ...state.transactions[idx], 
        desc, cat, date: dateStr, value: finalValue,
        payment, cardId: (payment.includes('cartao') ? cardId : null),
        recurringTemplate: isRecurring
      };
      saveState();
      showToast('Transação atualizada com sucesso.', 'success');
    }
  } else {
    for (let i = 0; i < installments; i++) {
      let d = parseDateBR(dateStr);
      if (!d) d = new Date();
      d.setMonth(d.getMonth() + i);
      const mDate = new Intl.DateTimeFormat('pt-BR').format(d);
      const isPast = d < new Date(); 
      state.transactions.unshift({
        id: uid('tx'),
        date: mDate,
        desc: installments > 1 ? `${desc} (${i + 1}/${installments})` : desc,
        cat,
        value: installValue,
        payment,
        cardId: (payment.includes('cartao') ? cardId : null),
        recurringTemplate: (i === 0 && isRecurring) ? true : undefined,
        installments: installments > 1 ? installments : undefined,
        installmentCurrent: installments > 1 ? i + 1 : undefined
      });
      // Deduct/Add balance immediately only if the transaction is not in the future
      if (isPast || installments === 1) state.balance += installValue;
    }
    saveState();
    showToast(installments > 1 ? `Criada em ${installments} parcelas.` : (isRecurring ? 'Transação e recorrência criadas.' : 'Transação criada com sucesso.'), 'success');
  }

  document.getElementById('tx-modal-overlay')?.classList.add('hidden');
  renderTransactions();
  if (window.appRenderAll) window.appRenderAll();
}

export function bindTxEvents() {
  const el = id => document.getElementById(id);

  el('tx-filter-btn')?.addEventListener('click', () => { el('tx-filter-menu')?.classList.toggle('hidden'); });
  el('tx-filter-close')?.addEventListener('click', () => { el('tx-filter-menu')?.classList.add('hidden'); });
  
  // Mapeamento correto de ID do input -> propriedade no state.ui
  const filterIdToStateKey = {
    'tx-search': 'txSearch',
    'tx-category': 'txCategory',
    'tx-sort': 'txSort'
  };
  ['tx-search', 'tx-category', 'tx-sort'].forEach(id => {
    el(id)?.addEventListener('input', (e) => {
      const key = filterIdToStateKey[id];
      if (key) state.ui[key] = e.target.value;
      state.ui.txPage = 0;
      renderTransactions();
    });
  });

  // [FIX #9] tx-reset não tinha listener, clicar não limpava os filtros
  el('tx-reset')?.addEventListener('click', () => {
    state.ui.txSearch = '';
    state.ui.txCategory = 'all';
    state.ui.txSort = 'date-desc';
    state.ui.txDateStart = null;
    state.ui.txDateEnd = null;
    state.ui.txPage = 0;
    renderTransactions();
    // Limpa label do filtro de período
    const periodLabel = document.getElementById('tx-period-label');
    if (periodLabel) periodLabel.textContent = 'Filtrar por período';
  });

  el('tx-add-btn')?.addEventListener('click', openTxModal);
  el('tx-modal-cancel')?.addEventListener('click', () => { el('tx-modal-overlay')?.classList.add('hidden'); });
  el('tx-modal-close')?.addEventListener('click', () => { el('tx-modal-overlay')?.classList.add('hidden'); });
  el('tx-modal-save')?.addEventListener('click', saveTxModal);

  el('tx-delete-cancel')?.addEventListener('click', () => { el('tx-delete-overlay')?.classList.add('hidden'); });
  el('tx-delete-confirm')?.addEventListener('click', deleteTx);

  el('tx-modal-payment')?.addEventListener('change', e => {
    const isCard = e.target.value.includes('cartao');
    const row = document.getElementById('tx-card-selector-row');
    const select = document.getElementById('tx-modal-card');
    const hint = document.getElementById('tx-card-hint');
    if (isCard) {
      if (row) row.classList.remove('hidden');
      if (select) {
        select.innerHTML = '<option value="">Selecione...</option>' + state.cards.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      }
      if (hint && e.target.value === 'cartao_credito') {
        hint.innerHTML = '<i class="fa-solid fa-circle-info mr-1"></i>O lançamento será somado à fatura e adiado no caixa.';
      } else if (hint) {
        hint.innerHTML = '<i class="fa-solid fa-bolt mr-1"></i>Lançado como débito: sai na hora do caixa.';
      }
    } else {
      if (row) row.classList.add('hidden');
      if (select) select.value = '';
    }
  });

  window.openEditTx = openEditTx;
  window.confirmDeleteTx = confirmDeleteTx;
  window.loadMoreTransactions = loadMoreTransactions;
}
