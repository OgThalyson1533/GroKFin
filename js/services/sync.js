/**
 * js/services/sync.js
 * Sincroniza o LocalStorage (state) com o banco relacional Supabase.
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import { currentUser } from './auth.js';
import { showToast } from '../utils/dom.js';

// Converte DD/MM/YYYY do local para YYYY-MM-DD do Postgres (DATE)
function toSqlDate(brDateStr) {
  if (!brDateStr) return new Date().toISOString().split('T')[0];
  const parts = brDateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return brDateStr; // Fallback
}

export async function syncToSupabase(state) {
  if (!isSupabaseConfigured || !currentUser) return;

  try {
    const uid = currentUser.id;

    // 1. Perfil
    if (state.profile) {
      await supabase.from('profiles').upsert({
        id: uid,
        nickname: state.profile.nickname,
        display_name: state.profile.displayName,
        handle: state.profile.handle,
        bio: state.profile.bio,
        avatar_url: state.profile.avatarImage,
        banner_url: state.profile.bannerImage
      });
    }

    // 2. Transações
    if (state.transactions && state.transactions.length > 0) {
      const txRows = state.transactions.map(t => ({
        id: t.id,
        user_id: uid,
        date: toSqlDate(t.date),
        description: t.desc,
        category: t.cat,
        amount: t.value
      }));
      // Upsert batch
      const { error } = await supabase.from('transactions').upsert(txRows);
      if (error) console.error('[Sync] Error syncing transactions:', error);
    }

    // 3. Metas
    if (state.goals && state.goals.length > 0) {
      const goalRows = state.goals.map(g => ({
        id: g.id,
        user_id: uid,
        name: g.nome,
        current_amount: g.atual,
        target_amount: g.total,
        theme: g.theme || 'generic',
        custom_image: g.img,
        deadline: g.deadline || null
      }));
      await supabase.from('goals').upsert(goalRows);
    }

    // 4. Cartões e Faturas
    if (state.cards && state.cards.length > 0) {
      const cardRows = state.cards.map(c => ({
        id: c.id,
        user_id: uid,
        name: c.name,
        flag: c.flag,
        card_type: c.cardType,
        color: c.color,
        card_limit: c.limit,
        closing_day: c.closing || null,
        due_day: c.due || null
      }));
      await supabase.from('cards').upsert(cardRows);

      // Faturas (Invoices)
      const invoiceRows = [];
      state.cards.forEach(card => {
        if (card.invoices && card.invoices.length > 0) {
          card.invoices.forEach(inv => {
            invoiceRows.push({
              id: inv.id,
              user_id: uid,
              card_id: card.id,
              description: inv.desc,
              category: inv.cat,
              amount: inv.value,
              installments: inv.installments || 1,
              installment_current: inv.installmentCurrent || 1
            });
          });
        }
      });
      if (invoiceRows.length > 0) {
        await supabase.from('card_invoices').upsert(invoiceRows);
      }
    }

    // 5. Investimentos
    if (state.investments && state.investments.length > 0) {
      const invRows = state.investments.map(i => ({
        id: i.id,
        user_id: uid,
        name: i.name,
        type: i.type,
        subtype: i.subtype,
        current_value: i.value,
        cost_basis: i.cost
      }));
      await supabase.from('investments').upsert(invRows);
    }

    // 6. Custos Fixos
    if (state.fixedExpenses && state.fixedExpenses.length > 0) {
      const fxRows = state.fixedExpenses.map(f => ({
        id: f.id,
        user_id: uid,
        name: f.name,
        category: f.cat,
        amount: f.value,
        execution_day: f.day,
        is_income: f.isIncome || false,
        is_active: f.active !== false
      }));
      await supabase.from('fixed_expenses').upsert(fxRows);
    }

    console.info('[Sync] Backup na nuvem concluído com sucesso.');

  } catch (error) {
    console.error('[Sync] Erro crítico no backup:', error);
  }
}

/**
 * Função opcional para fazer pull. Para a Fase 6 e 7 de um app offline-first,
 * geralmente quem tem primazia é o local, mas num cenário multi-device,
 * chamaríamos syncFromSupabase na carga do app para injetar no state local.
 */
export async function syncFromSupabase() {
  if (!isSupabaseConfigured || !currentUser) return null;
  // TODO: Implementar hydrate reverso de tabelas SQL -> JSON local State
  console.info('[Sync] Pull from Supabase não suportado neste estágio.');
  return null;
}
