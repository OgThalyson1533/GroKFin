/**
 * js/ui/onboarding.js — GrokFin Elite v6
 * ─────────────────────────────────────────────────────────────────────────────
 * FEATURE: "Onboarding Premium" — Tour de primeiro login com 4 etapas.
 *
 * Etapas:
 *  1. Boas-vindas + Criação de perfil (nome + e-mail opcional)
 *  2. Apreciação visual do app (feature highlights animados)
 *  3. Primeiro Input Guiado (saldo inicial + transação de entrada)
 *  4. Handover motivacional ("Tudo pronto — assuma o controle")
 *
 * Ativação: state.isNewUser === true (flag do banco/localStorage)
 * Após concluir: state.isNewUser = false, salvo via saveState()
 */

import { state, saveState } from '../state.js';
import { showToast } from '../utils/dom.js';
import { parseCurrencyInput, formatMoney } from '../utils/format.js';

// ─── CSS injetado dinamicamente ────────────────────────────────────────────────
const OB_STYLES = `
  @keyframes ob-fade-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ob-slide-up { from { opacity: 0; transform: translateY(32px) scale(.96); } to { opacity:1; transform:none; } }
  @keyframes ob-slide-out{ from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-24px) scale(.96); } }
  @keyframes ob-pop-in   { from { opacity: 0; transform: scale(.80); } to { opacity: 1; transform: scale(1); } }
  @keyframes ob-check    { 0%{stroke-dashoffset:40} 100%{stroke-dashoffset:0} }
  @keyframes ob-pulse-ring{ 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:.2;transform:scale(1.18)} }

  #ob-overlay { animation: ob-fade-in .4s ease both; }
  #ob-box { animation: ob-slide-up .38s cubic-bezier(.22,1,.36,1) both; }
  #ob-box.ob-exit { animation: ob-slide-out .28s ease both; pointer-events:none; }

  .ob-input {
    width: 100%; padding: 13px 16px; border-radius: 14px;
    border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.07);
    color: #fff; font-size: 15px; outline: none; transition: border-color .2s;
  }
  .ob-input:focus { border-color: rgba(0,245,255,.45); background: rgba(0,245,255,.06); }
  .ob-input::placeholder { color: rgba(255,255,255,.28); }

  .ob-btn-primary {
    width: 100%; padding: 14px; border-radius: 18px;
    background: linear-gradient(135deg,#00f5ff,#00ff85);
    border: none; font-size: 15px; font-weight: 700; color: #000;
    cursor: pointer; transition: transform .15s, box-shadow .2s;
    box-shadow: 0 0 24px rgba(0,245,255,.2);
  }
  .ob-btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 0 32px rgba(0,245,255,.35); }
  .ob-btn-primary:active { transform: scale(.98); }

  .ob-btn-ghost {
    width: 100%; padding: 13px; border-radius: 18px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05);
    color: rgba(255,255,255,.65); font-size: 14px; font-weight: 600;
    cursor: pointer; transition: background .18s, color .18s;
  }
  .ob-btn-ghost:hover { background: rgba(255,255,255,.1); color: #fff; }

  /* Progress dots */
  .ob-dot { width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.2); transition:all .3s; }
  .ob-dot.active { width:24px; border-radius:4px; background:linear-gradient(90deg,#00f5ff,#00ff85); }

  /* Feature cards */
  .ob-feat {
    display:flex; align-items:center; gap:14px; padding:14px 16px;
    border: 1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.05);
    border-radius:18px; animation: ob-slide-up .38s ease both;
    transition: border-color .2s, background .2s;
  }
  .ob-feat:hover { border-color:rgba(0,245,255,.2); background:rgba(0,245,255,.05); }
  .ob-feat:nth-child(1) { animation-delay: .05s; }
  .ob-feat:nth-child(2) { animation-delay: .12s; }
  .ob-feat:nth-child(3) { animation-delay: .19s; }
  .ob-feat:nth-child(4) { animation-delay: .26s; }

  /* Amount input highlight */
  .ob-amount-input {
    font-size: 32px; font-weight: 900; text-align: center; color: #fff;
    background: transparent; border: none; outline: none; width: 100%;
    letter-spacing: -1px;
  }
  .ob-amount-wrap {
    padding: 20px; border-radius: 20px;
    border: 1.5px solid rgba(0,245,255,.25); background: rgba(0,245,255,.06);
    margin-bottom: 4px; text-align: center;
  }

  /* Success check ring */
  .ob-check-ring {
    width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px;
    background: linear-gradient(135deg,rgba(0,245,255,.15),rgba(0,255,133,.15));
    border: 1.5px solid rgba(0,255,133,.3);
    display: flex; align-items: center; justify-content: center;
    animation: ob-pop-in .45s cubic-bezier(.22,1,.36,1) .1s both;
    position: relative;
  }
  .ob-check-ring::before {
    content:''; position:absolute; inset:-10px; border-radius:50%;
    border:1.5px solid rgba(0,255,133,.15);
    animation: ob-pulse-ring 2.5s ease-in-out infinite;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('ob-styles')) return;
  const style = document.createElement('style');
  style.id = 'ob-styles';
  style.textContent = OB_STYLES;
  document.head.appendChild(style);
}

function progressDots(current, total = 4) {
  return Array.from({ length: total }, (_, i) =>
    `<div class="ob-dot ${i + 1 === current ? 'active' : ''}"></div>`
  ).join('');
}

// ─── Step templates ───────────────────────────────────────────────────────────
function stepWelcome() {
  return `
    <div id="ob-box" class="w-full max-w-[440px]" style="
      background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.03));
      border:1px solid rgba(255,255,255,.1); border-radius:28px; padding:32px 28px;
      backdrop-filter:blur(24px); box-shadow:0 24px 64px rgba(0,0,0,.4)">

      <!-- Logo -->
      <div style="width:64px;height:64px;border-radius:22px;background:linear-gradient(135deg,#00f5ff,#00ff85);
        display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#000;
        margin:0 auto 20px;box-shadow:0 0 32px rgba(0,245,255,.35)">G</div>

      <h2 style="font-size:24px;font-weight:900;color:#fff;text-align:center;margin-bottom:6px;letter-spacing:-.5px">
        Bem-vindo ao GrokFin Elite
      </h2>
      <p style="font-size:14px;color:rgba(255,255,255,.55);text-align:center;margin-bottom:28px">
        Vamos personalizar sua experiência em 60 segundos.
      </p>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">
        <div>
          <label style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.15em;display:block;margin-bottom:6px">Seu nome</label>
          <input id="ob-name" type="text" class="ob-input" placeholder="Ex: João Silva" autocomplete="given-name"/>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.15em;display:block;margin-bottom:6px">Apelido <span style="opacity:.45">(opcional)</span></label>
          <input id="ob-nick" type="text" class="ob-input" placeholder="Como prefiro ser chamado" autocomplete="nickname"/>
        </div>
      </div>

      <button id="ob-next-1" class="ob-btn-primary" style="margin-bottom:10px">Continuar →</button>
      <button id="ob-skip-1" class="ob-btn-ghost">Pular personalização</button>

      <!-- Progress -->
      <div style="display:flex;justify-content:center;gap:6px;margin-top:20px">
        ${progressDots(1)}
      </div>
    </div>`;
}

function stepFeatures(name) {
  const firstName = name?.split(' ')[0] || 'você';
  const features = [
    { icon: 'fa-robot',       color: '#00f5ff', title: 'Chat com IA',       desc: 'Envie um comprovante ou fale com o microfone para lançar transações.' },
    { icon: 'fa-bullseye',    color: '#a78bfa', title: 'Metas inteligentes', desc: 'IA estima prazo, imagem e aporte mensal automaticamente.' },
    { icon: 'fa-chart-line',  color: '#6ee7b7', title: 'Painel em tempo real',desc: 'Burn diário, runway, score e projeção de 12 meses.' },
    { icon: 'fa-credit-card', color: '#fcd34d', title: 'Cartões & Fluxo',    desc: 'Controle faturas, envelopes e custos fixos num único lugar.' },
  ];

  return `
    <div id="ob-box" class="w-full max-w-[460px]" style="
      background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.03));
      border:1px solid rgba(255,255,255,.1); border-radius:28px; padding:32px 28px;
      backdrop-filter:blur(24px); box-shadow:0 24px 64px rgba(0,0,0,.4)">

      <p style="font-size:12px;font-weight:700;letter-spacing:.2em;color:rgba(0,245,255,.7);text-transform:uppercase;text-align:center;margin-bottom:8px">Seus novos superpoderes</p>
      <h2 style="font-size:22px;font-weight:900;color:#fff;text-align:center;margin-bottom:24px;letter-spacing:-.4px">
        ${firstName}, bem-vindo ao nível elite 🚀
      </h2>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
        ${features.map(f => `
          <div class="ob-feat">
            <span style="width:38px;height:38px;border-radius:12px;background:${f.color}18;border:1px solid ${f.color}30;
              display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="fa-solid ${f.icon}" style="font-size:16px;color:${f.color}"></i>
            </span>
            <div>
              <p style="font-size:13px;font-weight:700;color:#fff;margin-bottom:2px">${f.title}</p>
              <p style="font-size:12px;color:rgba(255,255,255,.55);line-height:1.4">${f.desc}</p>
            </div>
          </div>`).join('')}
      </div>

      <button id="ob-next-2" class="ob-btn-primary" style="margin-bottom:10px">Explorar →</button>

      <div style="display:flex;justify-content:center;gap:6px;margin-top:16px">
        ${progressDots(2)}
      </div>
    </div>`;
}

function stepFirstInput() {
  return `
    <div id="ob-box" class="w-full max-w-[440px]" style="
      background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.03));
      border:1px solid rgba(255,255,255,.1); border-radius:28px; padding:32px 28px;
      backdrop-filter:blur(24px); box-shadow:0 24px 64px rgba(0,0,0,.4)">

      <!-- Icon -->
      <div style="width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,rgba(0,245,255,.15),rgba(0,255,133,.15));
        border:1px solid rgba(0,245,255,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
        <i class="fa-solid fa-wallet" style="font-size:22px;color:#00f5ff"></i>
      </div>

      <h2 style="font-size:22px;font-weight:900;color:#fff;text-align:center;margin-bottom:6px;letter-spacing:-.4px">
        Dê vida ao seu painel
      </h2>
      <p style="font-size:14px;color:rgba(255,255,255,.55);text-align:center;margin-bottom:24px">
        Informe quanto você tem hoje. Isso inicializa o dashboard.
      </p>

      <!-- Balance input -->
      <div class="ob-amount-wrap" style="margin-bottom:16px">
        <p style="font-size:10px;font-weight:700;letter-spacing:.18em;color:rgba(0,245,255,.7);text-transform:uppercase;margin-bottom:8px">Saldo atual em conta (R$)</p>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px">
          <span style="font-size:22px;color:rgba(255,255,255,.4);font-weight:700">R$</span>
          <input id="ob-balance" type="text" class="ob-amount-input" placeholder="0,00" inputmode="decimal" autocomplete="off"/>
        </div>
        <p style="font-size:11px;color:rgba(255,255,255,.3);margin-top:6px">Você pode editar depois na aba Conta</p>
      </div>

      <!-- First transaction (optional) -->
      <div style="border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px;margin-bottom:20px;background:rgba(255,255,255,.03)">
        <p style="font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.15em;margin-bottom:12px">
          <i class="fa-solid fa-receipt" style="color:#a78bfa;margin-right:6px"></i>Primeiro lançamento <span style="color:rgba(255,255,255,.3)">(opcional)</span>
        </p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="ob-tx-desc" type="text" class="ob-input" style="padding:11px 14px;font-size:13px" placeholder="Ex: Salário de março"/>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="ob-tx-value" type="text" class="ob-input" style="padding:11px 14px;font-size:13px;text-align:right" placeholder="Valor R$" inputmode="decimal"/>
            <select id="ob-tx-type" class="ob-input" style="padding:11px 14px;font-size:13px;cursor:pointer">
              <option value="entrada">Entrada ↑</option>
              <option value="saida">Saída ↓</option>
            </select>
          </div>
        </div>
      </div>

      <button id="ob-next-3" class="ob-btn-primary" style="margin-bottom:10px">
        <i class="fa-solid fa-arrow-right" style="margin-right:8px"></i>Salvar e continuar
      </button>
      <button id="ob-skip-3" class="ob-btn-ghost">Pular esta etapa</button>

      <div style="display:flex;justify-content:center;gap:6px;margin-top:16px">
        ${progressDots(3)}
      </div>
    </div>`;
}

function stepHandover(name) {
  const firstName = name?.split(' ')[0] || 'você';
  const stats = [
    { label: 'Abas disponíveis', value: '9' },
    { label: 'IAs integradas', value: '2' },
    { label: 'Módulos ativos', value: '100%' },
  ];
  return `
    <div id="ob-box" class="w-full max-w-[440px]" style="
      background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.03));
      border:1px solid rgba(255,255,255,.1); border-radius:28px; padding:36px 28px;
      backdrop-filter:blur(24px); box-shadow:0 24px 64px rgba(0,0,0,.4); text-align:center">

      <!-- Animated check -->
      <div class="ob-check-ring">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M8 18L15 25L28 11" stroke="#00ff85" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round"
            stroke-dasharray="40" stroke-dashoffset="40"
            style="animation:ob-check .5s .2s ease forwards"/>
        </svg>
      </div>

      <p style="font-size:12px;font-weight:700;letter-spacing:.22em;color:rgba(0,245,255,.75);text-transform:uppercase;margin-bottom:8px">Sistema ativado</p>
      <h2 style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-.6px;margin-bottom:10px;line-height:1.1">
        Tudo pronto,<br>${firstName}.
      </h2>
      <p style="font-size:15px;color:rgba(255,255,255,.6);margin-bottom:28px;line-height:1.5;max-width:320px;margin-left:auto;margin-right:auto">
        Seu painel financeiro de alto nível está vivo.<br>Cada centavo vai contar a partir de agora.
      </p>

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:28px">
        ${stats.map(s => `
          <div style="border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);border-radius:16px;padding:14px 8px">
            <p style="font-size:22px;font-weight:900;color:#00f5ff;letter-spacing:-.5px">${s.value}</p>
            <p style="font-size:10px;color:rgba(255,255,255,.4);margin-top:3px;line-height:1.3">${s.label}</p>
          </div>`).join('')}
      </div>

      <!-- CTA hint -->
      <div style="border:1px solid rgba(0,245,255,.15);background:rgba(0,245,255,.06);border-radius:16px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:rgba(255,255,255,.65);text-align:left">
        <i class="fa-solid fa-lightbulb" style="color:#fcd34d;margin-right:8px"></i>
        Dica: use o <strong style="color:#fff">Chat</strong> para registrar gastos por voz ou enviar comprovantes 📸
      </div>

      <button id="ob-finish" class="ob-btn-primary">
        <i class="fa-solid fa-rocket" style="margin-right:8px"></i>Acessar Dashboard
      </button>

      <div style="display:flex;justify-content:center;gap:6px;margin-top:20px">
        ${progressDots(4)}
      </div>
    </div>`;
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export function initOnboarding() {
  if (!state.isNewUser) return;

  injectStyles();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'ob-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '9999',
    background: 'rgba(4,10,18,.88)', backdropFilter: 'blur(14px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  });
  document.body.appendChild(overlay);

  let step = 1;
  let collectedName = state.profile?.displayName || '';

  function render(html) {
    overlay.innerHTML = html;
    // Auto-focus first input
    setTimeout(() => overlay.querySelector('input')?.focus(), 80);
  }

  function animateOut(cb) {
    const box = document.getElementById('ob-box');
    if (box) {
      box.classList.add('ob-exit');
      setTimeout(cb, 260);
    } else {
      cb();
    }
  }

  function goStep(n) {
    animateOut(() => {
      step = n;
      switch (n) {
        case 1: render(stepWelcome()); break;
        case 2: render(stepFeatures(collectedName)); break;
        case 3: render(stepFirstInput()); break;
        case 4: render(stepHandover(collectedName)); break;
      }
    });
  }

  // ── Event delegation ──────────────────────────────────────────────────────
  overlay.addEventListener('click', (e) => {
    const id = e.target.closest('[id]')?.id;
    if (!id) return;

    // ── STEP 1: Welcome / Profile capture ──────────────────────────────────
    if (id === 'ob-next-1' || id === 'ob-skip-1') {
      if (id === 'ob-next-1') {
        const nameVal = document.getElementById('ob-name')?.value?.trim();
        const nickVal = document.getElementById('ob-nick')?.value?.trim();

        if (!nameVal) {
          const el = document.getElementById('ob-name');
          if (el) {
            el.style.borderColor = 'rgba(255,100,133,.6)';
            el.placeholder = 'Por favor, informe seu nome';
            el.focus();
          }
          return;
        }

        collectedName = nameVal;
        state.profile = state.profile || {};
        state.profile.displayName = nameVal;
        state.profile.nickname = nickVal || nameVal.split(' ')[0];
        state.profile.handle = '@' + nameVal.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '.user';
        saveState();
        if (window.renderHeaderMeta) window.renderHeaderMeta();
      }
      goStep(2);
    }

    // ── STEP 2: Feature showcase ───────────────────────────────────────────
    if (id === 'ob-next-2') {
      goStep(3);
    }

    // ── STEP 3: First input (saldo + transação) ────────────────────────────
    if (id === 'ob-next-3' || id === 'ob-skip-3') {
      if (id === 'ob-next-3') {
        const balanceRaw = document.getElementById('ob-balance')?.value;
        const balance = parseCurrencyInput(balanceRaw);

        if (!balance && balanceRaw?.trim()) {
          const el = document.getElementById('ob-balance');
          if (el) { el.style.color = '#ff6685'; el.focus(); }
          return;
        }

        // Save balance if provided
        if (balance > 0) {
          state.balance = balance;
        }

        // Save first transaction if provided
        const txDesc  = document.getElementById('ob-tx-desc')?.value?.trim();
        const txRaw   = document.getElementById('ob-tx-value')?.value;
        const txType  = document.getElementById('ob-tx-type')?.value;
        const txValue = parseCurrencyInput(txRaw);

        if (txDesc && txValue > 0) {
          const finalValue = txType === 'entrada' ? txValue : -txValue;
          state.transactions = state.transactions || [];
          state.transactions.unshift({
            id: 'ob_' + Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            desc: txDesc,
            cat: txType === 'entrada' ? 'Receita' : 'Rotina',
            value: finalValue,
          });
          state.balance = Number(((state.balance || 0) + finalValue).toFixed(2));
        }

        saveState();
        if (window.appRenderAll) window.appRenderAll();
      }
      goStep(4);
    }

    // ── STEP 4: Handover / Finish ──────────────────────────────────────────
    if (id === 'ob-finish') {
      state.isNewUser = false;
      saveState();

      // Animate overlay out
      overlay.style.transition = 'opacity .4s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        if (window.switchTab) window.switchTab(0);
        setTimeout(() => {
          showToast(`🚀 Bem-vindo ao GrokFin Elite, ${collectedName || 'Usuário'}!`, 'success');
        }, 300);
      }, 400);
    }
  });

  // Keyboard: Enter avança dentro dos inputs
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
    e.preventDefault();
    // Click the primary button of current step
    const primary = overlay.querySelector('.ob-btn-primary');
    if (primary) primary.click();
  });

  // Start at step 1
  render(stepWelcome());
}
