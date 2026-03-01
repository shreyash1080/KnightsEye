// ─── WEBLLM MODULE (ES Module) ─── 

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) await navigator.storage.persist();
  }
}

// Global hook to track progress explicitly
window.llmLoadProgress = "0%";

window.initWebLLMEngine = async function(selectedModel, isAutoLoad = false) {
  if (window.webllmEngine) return;
  try {
    let isCached = false;
    if (webllm.hasModelInCache) {
      try { isCached = await webllm.hasModelInCache(selectedModel); } catch(e) {}
    } else {
      isCached = localStorage.getItem('ke_downloaded_' + selectedModel) === 'true';
    }

    if (isAutoLoad && !isCached) {
      console.log('Model not in cache. Canceling auto-download.');
      currentCoachType = 'basic';
      localStorage.setItem('ke_coach_type', 'basic');
      updateCoachUI();
      return;
    }

    await requestPersistentStorage();

    if (isCached) {
      showLoading("Loading AI Coach...", "Loading from your local browser cache. No data used.");
    } else {
      showLoading("Downloading AI Model (~1GB)...", "This downloads once to your device. Do not close the tab.");
    }

    const initProgressCallback = (report) => {
      // Create percentage
      const pct = Math.round(report.progress * 100) + "%";
      window.llmLoadProgress = pct;

      // Update loading overlay if it happens to be showing
      const msgLabel = document.getElementById('loading-sub-msg');
      if(msgLabel) msgLabel.textContent = report.text;

      // Real-time update inside the actual Coach panel!
      const coachResp = document.getElementById('coach-response');
      if (coachResp && (!window.webllmEngine)) {
         // Prevent overriding active coach messages
         if (!coachResp.querySelector('.coach-message')) {
             coachResp.innerHTML = `
               <div style="padding:20px;text-align:center;color:var(--text-1);font-size:12px;height:100%;display:flex;flex-direction:column;justify-content:center;">
                 <svg class="robo-icon robo-anim" viewBox="0 0 24 24" style="width:40px;height:40px;color:#1baca6;margin:0 auto 15px auto;fill:currentColor;"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 0 1 3 3v2h2v4h-2v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2H2v-4h2V10a3 3 0 0 1 3-3h3V5.73A2 2 0 1 1 12 2zm3 13H9v2h6v-2zm-4-4H9v2h2v-2zm5 0h-2v2h2v-2z"></path></svg>
                 <div style="margin-bottom:8px;">Downloading AI Model... <span style="color:#1baca6;font-weight:bold;">${pct}</span></div>
                 <div style="width:100%;height:6px;background:var(--bg-3);border-radius:3px;overflow:hidden;">
                   <div style="width:${pct};height:100%;background:#1baca6;transition:width 0.3s;"></div>
                 </div>
                 <div style="font-size:10px;color:var(--text-2);margin-top:10px;">${report.text}</div>
               </div>`;
         }
      }
    };

    const engine = new webllm.MLCEngine();
    engine.setInitProgressCallback(initProgressCallback);
    await engine.reload(selectedModel);

    // Assign to global
    window.webllmEngine = engine;

    localStorage.setItem('ke_downloaded_' + selectedModel, 'true');
    hideLoading();
    
    // Unlock the Ask Coach button now that it's finished loading!
    updateCoachUI();

    const ind = document.getElementById('ai-status-indicator');
    if (ind) ind.style.display = 'flex';
    const lbl = document.getElementById('ai-status-label');
    if (lbl) lbl.textContent = 'AI Ready';

    if (state.totalMoves > 0 && !state.analyzing) precomputeAllCoachResponses();

  } catch (err) {
    console.error(err);
    hideLoading();
    if (!isAutoLoad) {
      let extraNote = "";
      if (window.location.protocol === 'file:') {
        extraNote = "<br><br><b>Notice:</b> You are running from a local file. AI capabilities require a secure server context. Please use VS Code Live Server.";
      }
      showErrorModal("AI Engine Failed", "Your browser may not support WebGPU, or the download failed.<br><br>" + err.message + extraNote);
    }
    currentCoachType = 'basic';
    localStorage.setItem('ke_coach_type', 'basic');
    updateCoachUI();
  }
};

window.acceptOnboardingAI = function() {
  localStorage.setItem('ke_onboarded', 'true');
  document.getElementById('onboarding-modal').classList.remove('open');
  document.getElementById('ai-warning-modal').classList.add('open');
};

window.declineOnboardingAI = function() {
  localStorage.setItem('ke_onboarded', 'true');
  document.getElementById('onboarding-modal').classList.remove('open');
  currentCoachType = 'basic';
  localStorage.setItem('ke_coach_type', 'basic');
  updateCoachUI();
};