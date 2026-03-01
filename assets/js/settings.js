// ─── SETTINGS & VOICE ───

function checkCoachType() {
  const val = document.getElementById('coach-type-select').value;
  const model = document.getElementById('model-select').value;
  const isCached = localStorage.getItem('ke_downloaded_' + model) === 'true';

  if (val === 'webllm' && !isCached) {
    document.getElementById('settings-modal').classList.remove('open');
    document.getElementById('ai-warning-modal').classList.add('open');
  } else if (val === 'webllm' && isCached) {
    document.getElementById('webllm-settings').style.display = 'block';
  } else {
    document.getElementById('webllm-settings').style.display = 'none';
  }
}

function acceptAIWarning() {
  document.getElementById('ai-warning-modal').classList.remove('open');
  document.getElementById('settings-modal').classList.add('open');
  document.getElementById('webllm-settings').style.display = 'block';
  document.getElementById('coach-type-select').value = 'webllm';
}

function declineAIWarning() {
  document.getElementById('ai-warning-modal').classList.remove('open');
  document.getElementById('settings-modal').classList.add('open');
  document.getElementById('coach-type-select').value = 'basic';
  document.getElementById('webllm-settings').style.display = 'none';
}

function openSettings() {
  document.getElementById('settings-modal').classList.add('open');
  document.getElementById('coach-type-select').value = currentCoachType;
  document.getElementById('webllm-settings').style.display = currentCoachType === 'webllm' ? 'block' : 'none';
  
  // Apply smart defaults based on the device detected in state.js
  document.getElementById('model-select').value = localStorage.getItem('ke_model') || window.defaultLLMModel;
  document.getElementById('coach-style').value = localStorage.getItem('ke_coach_style') || 'friendly';
  document.getElementById('auto-coach-mode').value = localStorage.getItem('ke_auto_mode') || 'all';
  
  const savedSpeed = localStorage.getItem('ke_voice_speed') || '1.0';
  document.getElementById('voice-speed').value = savedSpeed;
  document.getElementById('speed-display').textContent = parseFloat(savedSpeed).toFixed(1) + '\u00d7';
  document.getElementById('cb-voice-coach').checked = voiceEnabled;
  document.getElementById('cb-voice-moves').checked = voiceMovesEnabled;
  populateVoices();
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('open');
}

function saveSettings() {
  const selectedType = document.getElementById('coach-type-select').value;
  const model = document.getElementById('model-select').value;
  const prevModel = localStorage.getItem('ke_model');
  
  currentCoachType = selectedType;
  localStorage.setItem('ke_coach_type', currentCoachType);
  localStorage.setItem('ke_model', model);
  localStorage.setItem('ke_coach_style', document.getElementById('coach-style').value);
  localStorage.setItem('ke_auto_mode', document.getElementById('auto-coach-mode').value);
  localStorage.setItem('ke_voice_speed', document.getElementById('voice-speed').value);
  
  voiceEnabled = document.getElementById('cb-voice-coach').checked;
  voiceMovesEnabled = document.getElementById('cb-voice-moves').checked;
  localStorage.setItem('ke_voice_enabled', voiceEnabled);
  localStorage.setItem('ke_voice_moves', voiceMovesEnabled);
  
  const selIdx = document.getElementById('voice-select').selectedIndex;
  if (selIdx >= 0) localStorage.setItem('ke_voice_idx', selIdx);
  
  closeSettings();
  updateCoachUI();
  
  if (currentCoachType === 'webllm' && (model !== prevModel || !window.webllmEngine)) {
    window.webllmEngine = null;
    if (window.initWebLLMEngine) window.initWebLLMEngine(model, false);
  }
}

function updateAutoCoach() {
  localStorage.setItem('ke_auto_coach', document.getElementById('auto-coach-cb').checked);
}

function populateVoices() {
  const voices = window.speechSynthesis.getVoices();
  const sel = document.getElementById('voice-select');
  if (!sel) return;
  const saved = parseInt(localStorage.getItem('ke_voice_idx') || 0);
  sel.innerHTML = '';
  voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = v.name + ' (' + v.lang + ')';
    if (i === saved) opt.selected = true;
    sel.appendChild(opt);
  });
}

function speak(text) {
  if (!voiceEnabled) return;
  const clean = text.replace(/[\u{1F600}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();
  const selIdx = parseInt(localStorage.getItem('ke_voice_idx') || 0);
  const speed = parseFloat(localStorage.getItem('ke_voice_speed') || 1.0);
  const utter = new SpeechSynthesisUtterance(clean);
  if (voices[selIdx]) utter.voice = voices[selIdx];
  utter.rate = speed;
  window.speechSynthesis.speak(utter);
}

function speakMoveOnly(text) {
  if (!voiceMovesEnabled) return;
  const clean = text.replace(/[\u{1F600}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  if (!window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  const selIdx = parseInt(localStorage.getItem('ke_voice_idx') || 0);
  const speed = parseFloat(localStorage.getItem('ke_voice_speed') || 1.0);
  const utter = new SpeechSynthesisUtterance(clean);
  if (voices[selIdx]) utter.voice = voices[selIdx];
  utter.rate = speed;
  window.speechSynthesis.speak(utter);
}