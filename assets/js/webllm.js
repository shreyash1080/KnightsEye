// ─── WEBLLM MODULE (ES Module) ─── 
// This file is loaded as type="module" in index.html

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) await navigator.storage.persist();
  }
}

window.initWebLLMEngine = async function(selectedModel, isAutoLoad = false) {
  if (webllmEngine) return;
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
      document.getElementById('loading-sub-msg').textContent = report.text;
    };

    const engine = new webllm.MLCEngine();
    engine.setInitProgressCallback(initProgressCallback);
    await engine.reload(selectedModel);

    // Assign to global
    webllmEngine = engine;

    localStorage.setItem('ke_downloaded_' + selectedModel, 'true');
    hideLoading();
    updateCoachUI();

    document.getElementById('ai-status-indicator').style.display = 'flex';
    document.getElementById('ai-status-label').textContent = 'AI Ready';

    if (state.totalMoves > 0 && !state.analyzing) precomputeAllCoachResponses();

  } catch (err) {
    console.error(err);
    hideLoading();
    if (!isAutoLoad) {
      showErrorModal("AI Engine Failed", "Your browser may not support WebGPU, or the download failed.<br><br>" + err.message);
    }
    currentCoachType = 'basic';
    localStorage.setItem('ke_coach_type', 'basic');
    updateCoachUI();
  }
};

window.acceptOnboardingAI = function() {
  localStorage.setItem('ke_onboarded', 'true');
  document.getElementById('onboarding-modal').classList.remove('open');
  // Show the big AI warning before allowing download
  document.getElementById('ai-warning-modal').classList.add('open');
};

window.declineOnboardingAI = function() {
  localStorage.setItem('ke_onboarded', 'true');
  document.getElementById('onboarding-modal').classList.remove('open');
  currentCoachType = 'basic';
  localStorage.setItem('ke_coach_type', 'basic');
  updateCoachUI();
};
