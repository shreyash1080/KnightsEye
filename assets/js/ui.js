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
  const msg = document.getElementById('coach-idle-msg');
  if (currentCoachType === 'webllm') {
    badge.className = 'coach-type-badge badge-ai';
    badge.textContent = 'AI Coach Mode';
    if (msg) msg.textContent = 'AI Strategy Mode loaded. Navigate to a move and click Ask Coach.';
  } else {
    badge.className = 'coach-type-badge badge-basic';
    badge.textContent = 'Basic Mode (Fast)';
    if (msg) msg.textContent = 'Basic Mode Ready. Navigate to a move and click Ask Coach.';
  }
}

function exportPGN() {
  let output = '';
  for (let key in state.headers) {
    output += `[${key} "${state.headers[key]}"]\n`;
  }
  output += '\n';
  state.moves.slice(1).forEach((m, i) => {
    if (i % 2 === 0) output += `${(i / 2) + 1}. `;
    output += `${m.san} `;
    if (m.eval !== null && m.eval !== undefined) {
      output += `{ [%eval ${(m.eval / 100).toFixed(2)}] } `;
    }
  });
  navigator.clipboard.writeText(output.trim());
  setStatus('Annotated PGN Copied to Clipboard!', 'done');
  setTimeout(() => { if (!state.analyzing) setStatus('Analysis complete', 'done'); }, 3000);
}
