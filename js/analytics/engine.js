/**
 * js/analytics/engine.js — GrokFin Elite v6
 * Motor de analytics: calculateAnalytics, buildPrimaryInsight, buildSmartInsights.
 * Funções puras — recebem state como parâmetro, não acessam variável global.
 */

import { parseDateBR, addMonths } from '../utils/date.js';
import { formatMoney, formatNumber, formatPercent } from '../utils/format.js';
import { clamp } from '../utils/math.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameMonth(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function diffMonths(from, to) {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1);
}

/** Data mais recente entre as transações (ou hoje se não houver transações) */
export function getReferenceDate(state) {
  if (!state?.transactions?.length) return new Date();
  const timestamps = state.transactions
    .map(t => parseDateBR(t.date))
    .filter(Boolean)
    .map(d => d.getTime());
  return timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
}

// ── Meta helpers ───────────────────────────────────────────────────────────────

export function getGoalProgress(goal) {
  return clamp(Math.round((goal.atual / goal.total) * 100), 0, 100);
}

export function getMonthlyNeed(goal, refDate = new Date()) {
  const deadline = new Date(goal.deadline);
  const months   = diffMonths(refDate, deadline);
  const remaining = Math.max(0, goal.total - goal.atual);
  return remaining === 0 ? 0 : Math.ceil(remaining / months);
}

// ── Health caption ─────────────────────────────────────────────────────────────

export function getHealthCaption(score) {
  if (score >= 82) return 'Estrutura forte, metas respirando e boa folga de caixa.';
  if (score >= 68) return 'Bom equilíbrio, com alguns vazamentos pontuais para ajustar.';
  return 'Mês ainda pede disciplina em categorias-chave.';
}

// ── calculateAnalytics ────────────────────────────────────────────────────────

/**
 * Calcula todos os indicadores financeiros do mês corrente.
 * @param {Object} state — state global da aplicação
 * @returns {Object} analytics
 */
export function calculateAnalytics(state) {
  const ref = getReferenceDate(state);

  const monthTransactions = state.transactions.filter(t => {
    const d = parseDateBR(t.date);
    return d && sameMonth(d, ref);
  });

  const incomes  = monthTransactions.filter(t => t.value > 0).reduce((acc, t) => acc + t.value, 0);
  const expenses = monthTransactions.filter(t => t.value < 0).reduce((acc, t) => acc + Math.abs(t.value), 0);
  const net      = incomes - expenses;

  const expenseItems   = monthTransactions.filter(t => t.value < 0);
  const categoriesMap  = expenseItems.reduce((acc, t) => {
    acc[t.cat] = (acc[t.cat] || 0) + Math.abs(t.value);
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoriesMap).sort((a, b) => b[1] - a[1]);
  const topCategory     = categoryEntries[0]
    ? { name: categoryEntries[0][0], value: categoryEntries[0][1] }
    : { name: 'Sem dados', value: 0 };

  const daysElapsed  = Math.max(1, ref.getDate());
  const burnDaily    = expenses / daysElapsed;
  const runwayMonths = burnDaily > 0 ? state.balance / (burnDaily * 30) : 99;
  const savingRate   = incomes > 0 ? (net / incomes) * 100 : 0;
  const avgTicket    = expenseItems.length ? expenses / expenseItems.length : 0;

  const budgetUse = categoryEntries.map(([cat, value]) => {
    const limit = state.budgets[cat] || null;
    return { cat, value, limit, ratio: limit ? value / limit : null };
  }).sort((a, b) => (b.ratio || 0) - (a.ratio || 0));

  const overspend = budgetUse.find(item => item.ratio && item.ratio > 1) || null;

  const goalsProgress = state.goals.length
    ? state.goals.reduce((acc, goal) => acc + getGoalProgress(goal), 0) / state.goals.length
    : 0;

  const healthScore = clamp(
    Math.round(
      (clamp(savingRate, -10, 35) + 10) * 1.4 +
      Math.min(runwayMonths, 12) * 2.1 +
      goalsProgress * 0.35 +
      (overspend ? -8 : 6)
    ),
    22, 98
  );

  // Expense trend (last 7 days vs previous 7 days)
  const recentExpense = state.transactions
    .filter(t => {
      const d = parseDateBR(t.date);
      return d && t.value < 0 && d >= addDays(ref, -7);
    })
    .reduce((acc, t) => acc + Math.abs(t.value), 0);

  const previousExpense = state.transactions
    .filter(t => {
      const d = parseDateBR(t.date);
      return d && t.value < 0 && d < addDays(ref, -7) && d >= addDays(ref, -14);
    })
    .reduce((acc, t) => acc + Math.abs(t.value), 0);

  const expenseTrend = previousExpense > 0 ? ((recentExpense - previousExpense) / previousExpense) * 100 : 0;

  // 12-month forward projection (simple linear)
  const baselineNet = net || Math.max(incomes * 0.18, 850);
  const projection  = [];
  let simulated     = state.balance;

  for (let i = 0; i < 12; i++) {
    simulated += baselineNet;
    projection.push({
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(addMonths(ref, i + 1)),
      value: Math.round(simulated)
    });
  }

  const goalsDetailed = [...state.goals].map(goal => ({
    ...goal,
    progress:    getGoalProgress(goal),
    monthlyNeed: getMonthlyNeed(goal, ref),
    remaining:   Math.max(0, goal.total - goal.atual)
  }));

  const urgentGoal = goalsDetailed
    .filter(g => g.remaining > 0)
    .sort((a, b) => {
      if (a.monthlyNeed === b.monthlyNeed) return new Date(a.deadline) - new Date(b.deadline);
      return a.monthlyNeed - b.monthlyNeed;
    })[0] || null;

  return {
    ref, monthTransactions, incomes, expenses, net,
    categories: categoryEntries, topCategory,
    burnDaily, runwayMonths, savingRate, avgTicket,
    budgetUse, overspend, healthScore, expenseTrend,
    recentExpense, projection, urgentGoal, goalsDetailed, goalsProgress
  };
}

// ── buildPrimaryInsight ───────────────────────────────────────────────────────

export function buildPrimaryInsight(analytics, state) {
  if (analytics.overspend) {
    const item    = analytics.overspend;
    const exceed  = Math.max(0, item.value - item.limit);
    const targetSaving = analytics.incomes > 0
      ? ((analytics.net + exceed) / analytics.incomes) * 100
      : analytics.savingRate;
    return {
      label:  `Filtrar ${item.cat}`,
      action: { type: 'filter-category', category: item.cat },
      text:   `Seu gasto em **${item.cat}** já consumiu **${formatPercent(item.ratio * 100, 0)}** do orçamento. Cortando **${formatMoney(exceed)}** a taxa de poupança pode subir para **${formatPercent(targetSaving, 1)}**.`
    };
  }

  if (analytics.urgentGoal) {
    const goal     = analytics.urgentGoal;
    const applied  = Math.max(0, Math.round(Math.min(goal.monthlyNeed || 0, goal.remaining, Math.max(state.balance - 800, 0) || Math.min(state.balance, goal.remaining))));
    if (applied > 0) {
      return {
        label:  `Aportar ${formatMoney(applied)}`,
        action: { type: 'goal-contribution', goalId: goal.id, amount: applied },
        text:   `A meta **${goal.nome}** precisa de **${formatMoney(goal.monthlyNeed)}/mês**. Um aporte imediato de **${formatMoney(applied)}** antecipa a conclusão.`
      };
    }
  }

  return {
    label:  'Abrir relatório',
    action: { type: 'open-report' },
    text:   `Seu fluxo do mês está em **${formatMoney(analytics.net)}**, com runway de **${formatNumber(analytics.runwayMonths, 1)} meses**.`
  };
}

// ── buildSmartInsights ────────────────────────────────────────────────────────

export function buildSmartInsights(analytics, state) {
  const insights = [];

  if (analytics.overspend) {
    const excess = Math.max(0, analytics.overspend.value - analytics.overspend.limit);
    insights.push({
      type:  'alert',
      icon:  '⚠️',
      title: `${analytics.overspend.cat} acima do orçamento`,
      text:  `Gasto de ${formatMoney(analytics.overspend.value)} vs limite de ${formatMoney(analytics.overspend.limit)}. Excedente: ${formatMoney(excess)}.`
    });
  }

  if (analytics.savingRate >= 20) {
    insights.push({
      type:  'positive',
      icon:  '🏆',
      title: 'Taxa de poupança saudável',
      text:  `Você está poupando ${formatPercent(analytics.savingRate, 1)} da sua renda. Mantenha esse ritmo.`
    });
  } else if (analytics.savingRate < 10) {
    insights.push({
      type:  'alert',
      icon:  '📉',
      title: 'Taxa de poupança abaixo de 10%',
      text:  `Sua taxa está em ${formatPercent(analytics.savingRate, 1)}. Pelo menos 20% da renda garante crescimento patrimonial consistente.`
    });
  }

  if (analytics.burnDaily > 0) {
    insights.push({
      type:  'tip',
      icon:  '🔥',
      title: 'Burn diário',
      text:  `Você gasta em média ${formatMoney(analytics.burnDaily)} por dia, com runway de ${formatNumber(analytics.runwayMonths, 1)} meses.`
    });
  }

  if (analytics.urgentGoal) {
    const goal = analytics.urgentGoal;
    insights.push({
      type:  'tip',
      icon:  '🎯',
      title: `Meta urgente: ${goal.nome}`,
      text:  `${goal.progress}% concluída. Aporte ideal: ${formatMoney(goal.monthlyNeed)}/mês para bater o prazo.`
    });
  }

  return insights.slice(0, 4);
}
