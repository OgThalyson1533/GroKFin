/**
 * js/ui/chat-ui.js
 * Lógica do assistente chat, integração com AI e fallback.
 */

import { state, saveState } from '../state.js';
import { uid } from '../utils/math.js';
import { richText, formatMoney, parseCurrencyInput } from '../utils/format.js';
import { formatShortTime } from '../utils/date.js';
import { calculateAnalytics, buildPrimaryInsight } from '../analytics/engine.js';
import { showToast, normalizeText } from '../utils/dom.js';

let chatTyping = false;

// Helpers global exportados se necessários
export function scrollChatToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) container.scrollTop = container.scrollHeight;
}

export function ensureChatSeed() {
  if (!state.chatHistory?.length) {
    if (!state.chatHistory) state.chatHistory = [];
    state.chatHistory.push({
      id: uid('msg'),
      role: 'assistant',
      text: 'Olá! Eu sou o **GrokFin**. Seu painel agora lê **saldo, metas, categorias e projeção** em tempo real. Pergunte algo como **"onde estou gastando mais?"** ou anexe um comprovante.',
      createdAt: new Date().toISOString()
    });
    saveState();
  }
}

export function renderChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = state.chatHistory.map(message => {
    const isUser = message.role === 'user';
    return `
      <div class="flex ${isUser ? 'justify-end' : 'gap-3'}">
        ${isUser ? '' : `
          <div class="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-black shadow-brand">
            <i class="fa-solid fa-robot"></i>
          </div>
        `}
        <div class="max-w-[82%]">
          <div class="${isUser ? 'message-bubble-user' : 'message-bubble-ai'} rounded-[24px] px-5 py-4 ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}">
            <div class="text-[15px] leading-relaxed ${isUser ? 'text-black' : 'text-white/90'}">${richText(message.text)}</div>
          </div>
          <p class="mt-2 text-xs text-white/35 ${isUser ? 'text-right' : ''}">${formatShortTime(message.createdAt)}</p>
        </div>
      </div>
    `;
  }).join('');

  if (chatTyping) {
    const typingNode = document.createElement('div');
    typingNode.className = 'flex gap-3';
    typingNode.innerHTML = `
      <div class="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-black shadow-brand">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="message-bubble-ai rounded-[24px] rounded-tl-sm px-5 py-4">
        <div class="flex items-center">
          <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div>
      </div>
    `;
    container.appendChild(typingNode);
  }

  scrollChatToBottom();
}

export function pushChatMessage(role, text) {
  state.chatHistory.push({
    id: uid('msg'),
    role,
    text,
    createdAt: new Date().toISOString()
  });
  state.chatHistory = state.chatHistory.slice(-50);
  saveState();
  renderChat();
}

export function setChatTyping(value) {
  chatTyping = value;
  renderChat();
}

export async function sendGeminiMessage(userText, apiKey) {
  const analytics = calculateAnalytics(state);
  const recentTxs = state.transactions.slice(0, 8).map(t =>
    `${t.date} | ${t.desc} | ${t.cat} | ${t.value >= 0 ? '+' : ''}R$${Math.abs(t.value).toFixed(2)}`
  ).join('\n');

  const context = [
    'Você é o GrokFin, assistente financeiro pessoal inteligente.',
    'Responda em português do Brasil, de forma direta e prática.',
    'Use **negrito** para destacar valores e conceitos-chave.',
    'Máximo 3 parágrafos curtos.',
    '',
    'DADOS FINANCEIROS ATUAIS:',
    `Saldo: R$${state.balance.toFixed(2)}`,
    `Receita mês: R$${analytics.incomes.toFixed(2)}`,
    `Despesas mês: R$${analytics.expenses.toFixed(2)}`,
    `Fluxo líquido: R$${analytics.net.toFixed(2)}`,
    `Taxa de poupança: ${analytics.savingRate.toFixed(1)}%`,
    `Score financeiro: ${analytics.healthScore}/100`,
    `Burn diário: R$${analytics.burnDaily.toFixed(2)}`,
    `Maior gasto: ${analytics.topCategory.name} (R$${analytics.topCategory.value.toFixed(2)})`,
    `USD: R$${state.exchange.usd} | EUR: R$${state.exchange.eur}`,
    '',
    'ÚLTIMAS TRANSAÇÕES:',
    recentTxs
  ].join('\n');

  const payload = {
    contents: [{ parts: [{ text: context + '\n\nPergunta do usuário: ' + userText }] }],
    generationConfig: { maxOutputTokens: 600, temperature: 0.7 }
  };

  const ENDPOINTS = [
    { model: 'gemini-2.0-flash', ver: 'v1beta' },
    { model: 'gemini-2.0-flash-lite', ver: 'v1beta' }
  ];
  
  let firstErr = null;

  for (const { model, ver } of ENDPOINTS) {
    try {
      const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        if (!firstErr) firstErr = new Error('Cota atingida. Limite gratuito: 15 req/min. Aguarde 1 minuto e tente novamente.');
        continue;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const detail = errData?.error?.message || '';
        if (res.status === 404 || detail.includes('not found') || detail.includes('not supported')) {
          if (!firstErr) firstErr = new Error('Modelo indisponível para sua conta.');
          continue;
        }
        if (res.status === 400) throw new Error('Chave inválida. Verifique em aistudio.google.com');
        if (res.status === 403) throw new Error('Acesso negado. Ative a API Gemini em aistudio.google.com');
        throw new Error(detail || `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      if (!firstErr) firstErr = new Error('Resposta vazia do Gemini.');
      continue;
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        throw new Error('Timeout — verifique sua conexão.');
      }
      throw e;
    }
  }

  throw firstErr || new Error('Gemini indisponível. Verifique sua chave.');
}

export function buildAssistantReply(rawText) {
  const question = normalizeText(rawText);
  const analytics = calculateAnalytics(state);

  if (question.includes('saldo') || question.includes('quanto tenho') || question.includes('caixa')) {
    return `Seu saldo disponível agora é **${formatMoney(state.balance)}**. No mês, você está com fluxo líquido de **${formatMoney(analytics.net)}**.`;
  }

  if (question.includes('gasto') || question.includes('despesa') || question.includes('onde')) {
    if (!analytics.categories.length) {
      return 'Ainda não há despesas suficientes para identificar uma categoria dominante.';
    }
    const [category, value] = analytics.categories[0];
    const budget = state.budgets[category];
    const ratio = budget ? (value / budget) * 100 : null;
    return `Sua maior pressão está em **${category}**, com **${formatMoney(value)}** no mês.${ratio ? ` Isso representa **${formatPercent(ratio, 0)}** do orçamento dessa categoria.` : ''}`;
  }

  if (question.includes('meta') || question.includes('objetivo') || question.includes('acelerar') || question.includes('caminho')) {
    const goal = analytics.urgentGoal;
    if (!goal) return 'Você não tem metas em aberto agora. Dá para criar uma nova meta e eu monto o plano na hora.';
    return `A meta mais sensível hoje é **${goal.nome}**. Ela está em **${goal.progress}%** e pede cerca de **${formatMoney(goal.monthlyNeed)}/mês** para bater o prazo.`;
  }

  if (question.includes('econom') || question.includes('cortar') || question.includes('poupar')) {
    if (analytics.overspend) {
      const exceed = Math.max(0, analytics.overspend.value - analytics.overspend.limit);
      return `O corte mais inteligente está em **${analytics.overspend.cat}**. Só de voltar para o orçamento planejado, você libera **${formatMoney(exceed)}** no mês.`;
    }
    return `Sua taxa de poupança atual é **${formatPercent(analytics.savingRate, 1)}**. O jeito mais simples de melhorar isso é segurar **${analytics.topCategory.name}**, hoje a categoria mais pesada do mês.`;
  }

  if (question.includes('dolar') || question.includes('euro') || question.includes('btc') || question.includes('bitcoin') || question.includes('cambio')) {
    return `Agora o câmbio local está em **USD ${state.exchange.usd}**, **EUR ${state.exchange.eur}** e **BTC R$ ${state.exchange.btc}**. Posso cruzar isso com uma meta sua se quiser.`;
  }

  if (question.includes('relatorio') || question.includes('diagnostico') || question.includes('resumo')) {
    return `Resumo rápido: fluxo líquido de **${formatMoney(analytics.net)}**, taxa de poupança em **${formatPercent(analytics.savingRate, 1)}**, runway de **${(analytics.runwayMonths||0).toFixed(1)} meses** e principal pressão em **${analytics.topCategory.name}**.`;
  }

  if (question.includes('burn') || question.includes('queimando') || question.includes('dia')) {
    return `Seu burn médio está em **${formatMoney(analytics.burnDaily)} por dia**. No ritmo atual, seu caixa cobre cerca de **${(analytics.runwayMonths||0).toFixed(1)} meses**.`;
  }

  if (question.includes('ola') || question.includes('oi') || question.includes('bom dia') || question.includes('boa tarde') || question.includes('boa noite')) {
    return 'Oi! Posso te responder sobre saldo, metas, categoria que mais pesa, câmbio ou transformar um comprovante em transação.';
  }

  return `Posso te ajudar com **saldo**, **maiores gastos**, **metas**, **relatório** e **câmbio**. Tenta algo como: **"onde estou gastando mais?"** ou **"qual meta devo acelerar?"**`;
}

export function handleBotTransaction(text) {
  const isIncome = text.toLowerCase().includes('recebi') || text.toLowerCase().includes('ganhei');
  const isExpense = text.toLowerCase().includes('gastei') || text.toLowerCase().includes('paguei') || text.toLowerCase().includes('comprei');

  if (!isIncome && !isExpense) return null;

  const valueMatch = text.match(/(?:R\$|r\$)?\s*(\d+[.,\d]*)/);
  if (!valueMatch) return null;

  let val = parseCurrencyInput(valueMatch[1]);
  if (val <= 0) return null;
  if (isExpense) val = -val;

  let cat = isIncome ? 'Receita' : 'Rotina';
  const l = text.toLowerCase();
  if (l.includes('mercado') || l.includes('ifood') || l.includes('comida') || l.includes('padaria') || l.includes('supermercado')) cat = 'Alimentação';
  else if (l.includes('uber') || l.includes('gasolina') || l.includes('transporte')) cat = 'Transporte';
  else if (l.includes('cinema') || l.includes('shopee') || l.includes('roupa')) cat = 'Lazer';
  else if (l.includes('farmacia') || l.includes('remedio') || l.includes('saude')) cat = 'Saúde';

  const desc = text.replace(/(recebi|ganhei|gastei|paguei|comprei)/i, '')
                   .replace(valueMatch[0], '')
                   .replace(/^(no|na|com|de|em\s|pra\s)/i, '')
                   .trim() || 'Despesa via chat';

  const tx = { id: uid('tx'), desc: desc.charAt(0).toUpperCase() + desc.slice(1), value: val, cat, date: new Date().toISOString().split('T')[0] };
  
  if (!state.transactions) state.transactions = [];
  state.transactions.push(tx);
  state.balance += val;
  saveState();
  if (window.appRenderAll) window.appRenderAll();

  return `Pronto! Registrei **${tx.desc}** no valor de **${formatMoney(val)}** na categoria **${cat}**. Seu saldo atualizado é **${formatMoney(state.balance)}**.`;
}

export async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input?.value.trim();
  if (!text) return;

  pushChatMessage('user', text);
  input.value = '';
  setChatTyping(true);

  const txReply = handleBotTransaction(text);
  if (txReply) {
    setChatTyping(false);
    pushChatMessage('assistant', txReply);
    return;
  }

  const apiKey = localStorage.getItem('grokfin_anthropic_key');
  if (apiKey) {
    try {
      const reply = await sendClaudeAPIMessage(text, apiKey);
      setChatTyping(false);
      pushChatMessage('assistant', reply);
      return;
    } catch (err) {
      setChatTyping(false);
      const isGemini = apiKey.startsWith('AIza');
      const providerName = isGemini ? 'Gemini' : 'Claude';
      pushChatMessage('assistant', `⚠️ **Erro na IA (${providerName}):** ${err.message}\n\nRespondendo com modo básico:`);
      const fallback = buildAssistantReply(text);
      pushChatMessage('assistant', fallback);
      return;
    }
  }

  setTimeout(() => {
    const reply = buildAssistantReply(text);
    setChatTyping(false);
    pushChatMessage('assistant', reply + '\n\n💡 _Conecte o Gemini (gratuito) pelas configurações para respostas mais inteligentes._');
  }, 720);
}

export async function sendClaudeAPIMessage(userText, apiKey) {
  if (apiKey.startsWith('AIza')) {
    return await sendGeminiMessage(userText, apiKey);
  }
  
  const analytics = calculateAnalytics(state);
  const recentTxs = state.transactions.slice(0, 10).map(t =>
    `${t.date} | ${t.desc} | ${t.cat} | ${t.value >= 0 ? '+' : ''}R$${Math.abs(t.value).toFixed(2)}`
  ).join('\n');

  const systemPrompt = `Você é o GrokFin, assistente financeiro pessoal ultra-inteligente. 
Responda em português do Brasil, de forma direta e prática. Máximo 3 parágrafos curtos.
Use **negrito** para destacar valores e conceitos-chave.

DADOS DA CONTA:
- Saldo: R$${state.balance.toFixed(2)}
- Receita mês: R$${analytics.incomes.toFixed(2)}
- Despesas mês: R$${analytics.expenses.toFixed(2)}
- Fluxo líquido: R$${analytics.net.toFixed(2)}
- Maior gasto: ${analytics.topCategory.name} (R$${analytics.topCategory.value.toFixed(2)})
- USD: R$${state.exchange.usd} | EUR: R$${state.exchange.eur}

ÚLTIMAS TRANSAÇÕES:
${recentTxs}`;

  const messages = [
    ...state.chatHistory.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: userText }
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: systemPrompt, messages }),
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || 'Sem resposta da IA.';
}

export async function sendGeminiImageMessage(base64, mimeType, apiKey) {
  const payload = {
    contents: [{
      parts: [
        { text: "Analise este comprovante ou imagem financeira. Se for uma despesa, extraia o valor, e o que foi pago. Seja breve e direto." },
        { inline_data: { mime_type: mimeType, data: base64 } }
      ]
    }]
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Falha no Gemini Vision API');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui ler a imagem.';
}

export function handleChatImageInput(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const base64Part = evt.target.result.split(',')[1];
    pushChatMessage('user', `[Imagem Anexada: ${file.name}]`);
    setChatTyping(true);

    const apiKey = localStorage.getItem('grokfin_anthropic_key');
    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        const reply = await sendGeminiImageMessage(base64Part, file.type, apiKey);
        setChatTyping(false);
        pushChatMessage('assistant', reply);
      } catch (err) {
        setChatTyping(false);
        pushChatMessage('assistant', `⚠️ Erro ao analisar imagem: ${err.message}`);
      }
    } else {
      setChatTyping(false);
      pushChatMessage('assistant', '⚠️ Para ler imagens, conecte uma chave **Gemini** (começa com AIza). Configure na aba Supabase/IA no login.');
    }
  };
  reader.readAsDataURL(file);
}

export function bindChatEvents() {
  const btn = document.getElementById('chat-send-btn');
  const input = document.getElementById('chat-input');
  const fileInput = document.getElementById('file-upload');
  
  if (btn) btn.addEventListener('click', sendChatMessage);
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); }
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', handleChatImageInput);
  }
}

// [FIX #6] sendChatPrompt: função para acionar o chat programaticamente.
// Era referenciada em goals-ui.js como window.sendChatPrompt mas nunca havia
// sido definida em nenhum arquivo, causando erro silencioso ao clicar em
// "Briefing IA" em uma meta. A função injeta o texto no input do chat e dispara
// o envio, tornando o atalho de metas funcional.
export function sendChatPrompt(text) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  input.value = String(text || '').trim();
  sendChatMessage();
}

// Expõe globalmente para uso via window.sendChatPrompt (ex: goals-ui.js)
window.sendChatPrompt = sendChatPrompt;
