import { state, saveState } from '../state.js';
import { renderProfile } from './profile-ui.js';
import { showToast } from '../utils/dom.js';

export function initOnboarding() {
  if (!state.isNewUser) return;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.className = 'fixed inset-0 z-[9999] bg-[#05171c]/90 flex items-center justify-center p-4 backdrop-blur-md';
  document.body.appendChild(overlay);

  let step = 1;

  function renderStep() {
    overlay.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'glass-panel max-w-md w-full rounded-[28px] p-8 text-center animate-[panelIn_.3s_ease]';

    if (step === 1) {
      box.innerHTML = `
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-emerald-300 text-3xl font-black text-black shadow-brand">G</div>
        <h2 class="text-2xl font-black text-white">Bem-vindo ao Elite</h2>
        <p class="mt-3 text-sm text-white/60 mb-6">Para personalizar sua experiência, como quer ser chamado?</p>
        <input type="text" id="ob-name" class="w-full text-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-300/50 mb-6" placeholder="Seu nome" />
        <button id="ob-next-1" class="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-6 py-3.5 font-bold text-black shadow-brand transition-transform hover:scale-[1.02]">Começar</button>
      `;
      overlay.appendChild(box);
      document.getElementById('ob-next-1').addEventListener('click', () => {
        const name = document.getElementById('ob-name').value.trim();
        if (name) {
          state.profile.displayName = name;
          state.profile.nickname = name.split(' ')[0];
          saveState();
          if (window.renderHeaderMeta) window.renderHeaderMeta();
          renderProfile();
        }
        step = 2;
        renderStep();
      });
    } else if (step === 2) {
      box.innerHTML = `
        <h2 class="text-xl font-black text-white mb-6">Seus novos poderes</h2>
        <div class="space-y-4 mb-8 text-left text-sm text-white/80">
          <div class="flex items-center gap-4 border border-white/8 bg-white/5 p-4 rounded-2xl">
            <i class="fa-solid fa-sparkles text-2xl text-violet-300 w-8 text-center"></i>
            <p><strong>Inteligência:</strong> IA embutida para ler caixa, metas e gerar relatórios instantâneos.</p>
          </div>
          <div class="flex items-center gap-4 border border-white/8 bg-white/5 p-4 rounded-2xl">
            <i class="fa-solid fa-bullseye text-2xl text-emerald-300 w-8 text-center"></i>
            <p><strong>Estratégia:</strong> Foque na sua meta mais urgente e direcione seu dinheiro.</p>
          </div>
          <div class="flex items-center gap-4 border border-white/8 bg-white/5 p-4 rounded-2xl">
            <i class="fa-solid fa-bolt text-2xl text-cyan-300 w-8 text-center"></i>
            <p><strong>Ação:</strong> Registre tudo diretamente no Chat com texto e recibos.</p>
          </div>
        </div>
        <button id="ob-next-2" class="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-6 py-3.5 font-bold text-black shadow-brand transition-transform hover:scale-[1.02]">Avançar</button>
      `;
      overlay.appendChild(box);
      document.getElementById('ob-next-2').addEventListener('click', () => {
        step = 3;
        renderStep();
      });
    } else if (step === 3) {
      box.innerHTML = `
        <h2 class="text-xl font-black text-white mb-4">Primeiro passo</h2>
        <p class="text-sm text-white/60 mb-6">Vamos dar vida ao seu dashboard. Registre seu primeiro movimento financeiro ou ajuste seu saldo.</p>
        <div class="space-y-3">
          <button id="ob-tx-btn" class="w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-6 py-3.5 font-bold text-white transition-colors hover:bg-cyan-300/20">Lançar Transação</button>
          <button id="ob-next-3" class="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-white/70 transition-colors hover:bg-white/10">Pular passo</button>
        </div>
      `;
      overlay.appendChild(box);
      document.getElementById('ob-next-3').addEventListener('click', () => {
        step = 4;
        renderStep();
      });
      document.getElementById('ob-tx-btn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        if (window.switchTab) window.switchTab(2); // Vai para Transações
        if (window.openEditTx) window.openEditTx();
        
        // Fica checando se o modal fechou
        const checkModal = setInterval(() => {
          const mod = document.getElementById('tx-modal-overlay');
          if (mod && mod.classList.contains('hidden')) {
            clearInterval(checkModal);
            overlay.classList.remove('hidden');
            step = 4;
            renderStep();
          }
        }, 500);
      });
    } else if (step === 4) {
      box.innerHTML = `
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
          <i class="fa-solid fa-check text-2xl"></i>
        </div>
        <h2 class="text-2xl font-black text-white">Tudo pronto</h2>
        <p class="mt-3 text-sm text-white/60 mb-8">O plano está montado. Agora é sua vez de assumir o controle total do seu fluxo.</p>
        <button id="ob-finish" class="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-6 py-3.5 font-bold text-black shadow-brand transition-transform hover:scale-[1.02]">Acessar Dashboard</button>
      `;
      overlay.appendChild(box);
      document.getElementById('ob-finish').addEventListener('click', () => {
        state.isNewUser = false;
        saveState();
        overlay.remove();
        if (window.switchTab) window.switchTab(0);
        showToast('Sucesso. Bem-vindo ao GrokFin Elite!', 'success');
      });
    }
  }

  renderStep();
}
