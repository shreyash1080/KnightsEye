// ─── UI UTILITIES ───

function showLoading(mainText, subText) {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('loading-msg').textContent = mainText;
  document.getElementById('loading-sub-msg').textContent = subText || 'Please wait...';
  overlay.style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function showErrorModal(title, msg) {
  document.getElementById('generic-error-title').textContent = title;
  document.getElementById('generic-error-msg').innerHTML = msg;
  document.getElementById('error-modal').classList.add('open');
}

function closeErrorModal() {
  document.getElementById('error-modal').classList.remove('open');
}

function setStatus(msg, type) {
  document.getElementById('status-text').textContent = msg;
  const dot = document.getElementById('status-dot');
  dot.className = 'status-dot ' + (type || 'idle');
}

function switchTab(tab) {
  ['engine', 'coach'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    document.getElementById('tab-content-' + t).style.display = (t === tab) ? 'flex' : 'none';
  });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function goHome() {
  document.getElementById('analyzer').classList.remove('visible');
  document.getElementById('landing-page').style.display = 'flex';
  document.getElementById('pgn-input').value = '';
  sfWorkers.forEach(w => w.worker.postMessage('stop'));
  setStatus('Ready', 'idle');
}

function updateCoachUI() {
  const badge = document.getElementById('ui-coach-type-badge');
  const askBtn = document.getElementById('coach-ask-btn');
  const msg = document.getElementById('coach-idle-msg');
  
  if (currentCoachType === 'webllm') {
    badge.className = 'coach-type-badge badge-ai';
    badge.innerHTML = '<svg class="robo-icon" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 0 1 3 3v2h2v4h-2v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2H2v-4h2V10a3 3 0 0 1 3-3h3V5.73A2 2 0 1 1 12 2zm3 13H9v2h6v-2zm-4-4H9v2h2v-2zm5 0h-2v2h2v-2z"/></svg> AI Coach Mode';
    
    // Disable the Ask Coach button if it hasn't finished downloading yet
    if (!window.webllmEngine) {
      if(askBtn) askBtn.disabled = true;
    } else {
      if(askBtn) askBtn.disabled = false;
      // Reset the response window now that it's ready
      const coachResp = document.getElementById('coach-response');
      if (coachResp && !coachResp.querySelector('.coach-message')) {
         coachResp.innerHTML = `
          <div class="coach-idle">
            <div class="coach-avatar"><svg class="robo-icon" viewBox="0 0 24 24" fill="currentColor" style="width:28px;height:28px;"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 0 1 3 3v2h2v4h-2v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2H2v-4h2V10a3 3 0 0 1 3-3h3V5.73A2 2 0 1 1 12 2zm3 13H9v2h6v-2zm-4-4H9v2h2v-2zm5 0h-2v2h2v-2z"/></svg></div>
            <div class="coach-idle-text" id="coach-idle-msg">AI Ready. Navigate to a move and click Ask Coach.</div>
          </div>`;
      }
    }
  } else {
    badge.className = 'coach-type-badge badge-basic';
    badge.innerHTML = '&#9889; Basic Mode (Fast)';
    if(askBtn) askBtn.disabled = false;
    
    const coachResp = document.getElementById('coach-response');
    if (coachResp && !coachResp.querySelector('.coach-message')) {
       coachResp.innerHTML = `
        <div class="coach-idle">
          <div class="coach-avatar"><svg class="robo-icon" viewBox="0 0 24 24" fill="currentColor" style="width:28px;height:28px;"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 0 1 3 3v2h2v4h-2v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2H2v-4h2V10a3 3 0 0 1 3-3h3V5.73A2 2 0 1 1 12 2zm3 13H9v2h6v-2zm-4-4H9v2h2v-2zm5 0h-2v2h2v-2z"/></svg></div>
          <div class="coach-idle-text" id="coach-idle-msg">Basic Mode Ready. Navigate to a move and click Ask Coach.</div>
        </div>`;
    }
  }
}