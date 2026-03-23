/**
 * js/ui/onboarding.js — GrokFin Elite v6
 * FEATURE: Tour de primeiro acesso premium (4 etapas).
 * Disparado apenas quando state.isNewUser === true.
 * Usa event delegation no overlay para máxima compatibilidade.
 */

import { state, saveState } from '../state.js';
import { showToast } from '../utils/dom.js';

// HTML de cada etapa (sem addEventListener inline — tudo via delegation)
function stepHtml(step) {
  if (step === 1) {
    return `
      <div id="ob-box" class="glass-panel max-w-md w-full rounded-[28px] p-8 text-center" style="animation:panelIn .35s ease both">
        <div style="margin:0 auto 20px;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#00f5ff,#00ff85);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#000;box-shadow:0 0 24px rgba(0,245,255,.3)">G</div>
        <h2 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:10px">Bem-vindo ao GrokFin Elite</h2>
        <p style="font-size:14px;color:rgba(255,255,255,.6);margin-bottom:24px">Para personalizar sua experiência, como quer ser chamado?</p>
        <input id="ob-name" type="text" placeholder="Seu nome"
          style="width:100%;text-align:center;padding:13px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;font-size:15px;outline:none;margin-bottom:18px">
        <button id="ob-next-1" style="width:100%;padding:14px;border-radius:20px;background:linear-gradient(135deg,#00f5ff,#00ff85);border:none;font-size:15px;font-weight:700;color:#000;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          Começar →
        </button>
      </div>
    `;
  }
  if (step === 2) {
    return `
      <div id="ob-box" class="glass-panel max-w-md w-full rounded-[28px] p-8" style="animation:panelIn .35s ease both">
        <h2 style="font-size:20px;font-weight:900;color:#fff;margin-bottom:20px;text-align:center">Seus novos poderes</h2>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);padding:14px;border-radius:18px">
            <i class="fa-solid fa-sparkles" style="font-size:22px;color:#a78bfa;width:32px;text-align:center"></i>
            <p style="font-size:13px;color:rgba(255,255,255,.82)"><strong style="color:#fff">Inteligência:</strong> IA embutida lê caixa, metas e gera relatórios instantâneos.</p>
          </div>
          <div style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);padding:14px;border-radius:18px">
            <i class="fa-solid fa-bullseye" style="font-size:22px;color:#6ee7b7;width:32px;text-align:center"></i>
            <p style="font-size:13px;color:rgba(255,255,255,.82)"><strong style="color:#fff">Estratégia:</strong> Foque na meta mais urgente e direcione cada centavo.</p>
          </div>
          <div style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);padding:14px;border-radius:18px">
            <i class="fa-solid fa-bolt" style="font-size:22px;color:#67e8f9;width:32px;text-align:center"></i>
            <p style="font-size:13px;color:rgba(255,255,255,.82)"><strong style="color:#fff">Ação:</strong> Registre despesas com texto ou envie comprovantes pelo Chat.</p>
          </div>
        </div>
        <button id="ob-next-2" style="width:100%;padding:14px;border-radius:20px;background:linear-gradient(135deg,#00f5ff,#00ff85);border:none;font-size:15px;font-weight:700;color:#000;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          Próximo →
        </button>
      </div>
    `;
  }
  if (step === 3) {
    return `
      <div id="ob-box" class="glass-panel max-w-md w-full rounded-[28px] p-8 text-center" style="animation:panelIn .35s ease both">
        <h2 style="font-size:20px;font-weight:900;color:#fff;margin-bottom:10px">Primeiro passo</h2>
        <p style="font-size:14px;color:rgba(255,255,255,.6);margin-bottom:24px">Dê vida ao dashboard. Registre seu primeiro movimento financeiro ou pule para explorar.</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button id="ob-tx-btn" style="width:100%;padding:13px;border-radius:18px;border:1px solid rgba(0,245,255,.3);background:rgba(0,245,255,.1);color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:background .18s" onmouseover="this.style.background='rgba(0,245,255,.18)'" onmouseout="this.style.background='rgba(0,245,255,.1)'">
            <i class="fa-solid fa-plus" style="margin-right:8px"></i>Lançar Transação
          </button>
          <button id="ob-next-3" style="width:100%;padding:13px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.65);font-size:14px;font-weight:600;cursor:pointer;transition:background .18s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='rgba(255,255,255,.05)'">
            Pular →
          </button>
        </div>
      </div>
    `;
  }
  if (step === 4) {
    return `
      <div id="ob-box" class="glass-panel max-w-md w-full rounded-[28px] p-8 text-center" style="animation:panelIn .35s ease both">
        <div style="margin:0 auto 20px;width:64px;height:64px;border-radius:50%;border:1px solid rgba(110,231,183,.25);background:rgba(110,231,183,.1);display:flex;align-items:center;justify-content:center">
          <i class="fa-solid fa-check" style="font-size:26px;color:#6ee7b7"></i>
        </div>
        <h2 style="font-size:22px;font-weight:900;color:#fff;margin-bottom:10px">Tudo pronto.</h2>
        <p style="font-size:14px;color:rgba(255,255,255,.6);margin-bottom:28px">Agora é a sua vez de assumir o controle total do seu fluxo financeiro.</p>
        <button id="ob-finish" style="width:100%;padding:14px;border-radius:20px;background:linear-gradient(135deg,#00f5ff,#00ff85);border:none;font-size:15px;font-weight:700;color:#000;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          Acessar Dashboard
        </button>
      </div>
    `;
  }
  return '';
}

export function initOnboarding() {
  if (!state.isNewUser) return;

  // Create full-screen overlay
  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    background: 'rgba(5,23,28,.92)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  });
  document.body.appendChild(overlay);

  let step = 1;

  function render() {
    overlay.innerHTML = stepHtml(step);
  }

  // Use EVENT DELEGATION on the overlay — avoids timing issues with innerHTML
  overlay.addEventListener('click', (e) => {
    const id = e.target.closest('[id]')?.id;
    if (!id) return;

    if (id === 'ob-next-1') {
      const nameVal = document.getElementById('ob-name')?.value?.trim() || '';
      if (nameVal) {
        state.profile = state.profile || {};
        state.profile.displayName = nameVal;
        state.profile.nickname = nameVal.split(' ')[0];
        saveState();
        if (window.renderHeaderMeta) window.renderHeaderMeta();
        if (window.appRenderAll) window.appRenderAll();
      }
      step = 2;
      render();
    }

    if (id === 'ob-next-2') {
      step = 3;
      render();
    }

    if (id === 'ob-tx-btn') {
      overlay.style.display = 'none';
      if (window.switchTab) window.switchTab(2);
      // Retry finding modal open function since it might be async
      let attempts = 0;
      const tryOpen = setInterval(() => {
        attempts++;
        if (window.openEditTx) {
          clearInterval(tryOpen);
          window.openEditTx();
          // Watch for modal close
          const watchClose = setInterval(() => {
            const mod = document.getElementById('tx-modal-overlay');
            if (!mod || mod.classList.contains('hidden')) {
              clearInterval(watchClose);
              overlay.style.display = 'flex';
              step = 4;
              render();
            }
          }, 600);
        }
        if (attempts > 10) { clearInterval(tryOpen); overlay.style.display = 'flex'; step = 3; render(); }
      }, 200);
    }

    if (id === 'ob-next-3') {
      step = 4;
      render();
    }

    if (id === 'ob-finish') {
      state.isNewUser = false;
      saveState();
      overlay.remove();
      if (window.switchTab) window.switchTab(0);
      showToast('Bem-vindo ao GrokFin Elite!', 'success');
    }
  });

  render();
}
