// ─── MAIN APP - GAME PROCESSING & INIT ───

function loadDemo() {
  document.getElementById('pgn-input').value = demoPGN;
  analyzeFromPGN();
}

async function analyzeFromPGN() {
  const pgn = document.getElementById('pgn-input').value.trim();
  if (!pgn) { showErrorModal("Input Required", "Please paste a PGN text first."); return; }
  showLoading("Parsing PGN...", "Reading game moves");
  try {
    await processGame(pgn);
  } catch(e) {
    hideLoading();
    showErrorModal("Parsing Error", 'Error parsing PGN. Make sure it is formatted correctly.<br><br>' + e.message);
  }
}

async function processGame(pgn) {
  const chess = new Chess();
  if (!chess.load_pgn(pgn, { sloppy: true })) {
    const cleaned = pgn.replace(/\{[^}]*\}/g, '').replace(/\$\d+/g, '').trim();
    if (!chess.load_pgn(cleaned, { sloppy: true })) throw new Error('Could not parse PGN. Make sure it is valid.');
  }

  state.headers = chess.header();
  state.pgn = pgn;
  const history = chess.history({ verbose: true });
  const chess2 = new Chess();

  state.moves = [];
  state.evalHistory = [];
  coachCache = {};
  precomputeQueue = [];

  state.moves.push({ fen: chess2.fen(), san: null, eval: null, classification: null });
  for (const move of history) {
    chess2.move(move);
    state.moves.push({ fen: chess2.fen(), san: move.san, from: move.from, to: move.to, color: move.color, eval: null, bestMove: null, classification: null, cpLoss: null, engineLines: [] });
  }

  state.totalMoves = state.moves.length - 1;
  state.currentMove = 0;

  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('analyzer').classList.add('visible');

  const h = state.headers;
  document.getElementById('white-name').textContent = h.White || 'White';
  document.getElementById('black-name').textContent = h.Black || 'Black';
  document.getElementById('white-rating').textContent = h.WhiteElo ? h.WhiteElo + ' ELO' : '';
  document.getElementById('black-rating').textContent = h.BlackElo ? h.BlackElo + ' ELO' : '';
  document.getElementById('bottom-player-name').textContent = h.White || 'White';
  document.getElementById('top-player-name').textContent = h.Black || 'Black';

  detectOpening(history);

  setTimeout(() => { initBoard(); renderBoard(); renderMoveList(); }, 50);

  showLoading("Booting Parallel Engines...", "Waking up to 4 Stockfish cores for maximum speed");
  await runEngineAnalysis();
}

function detectOpening(history) {
  if (!history.length) return;
  const line = history.slice(0, Math.min(10, history.length)).map(m => m.san).join(' ');
  const openings = [
    ['Sicilian Defense', /e4 c5/],
    ['French Defense', /e4 e6/],
    ['Caro-Kann Defense', /e4 c6/],
    ['Pirc Defense', /e4 d6/],
    ["Queen's Gambit Declined", /d4 d5 c4 e6/],
    ["Queen's Gambit Accepted", /d4 d5 c4 dxc4/],
    ["King's Indian Defense", /d4 Nf6 c4 g6/],
    ["Nimzo-Indian Defense", /d4 Nf6 c4 e6 Nc3 Bb4/],
    ["Ruy Lopez", /e4 e5 Nf3 Nc6 Bb5/],
    ["Italian Game", /e4 e5 Nf3 Nc6 Bc4/],
    ["Scotch Game", /e4 e5 Nf3 Nc6 d4/],
    ["King's Gambit", /e4 e5 f4/],
    ["Petrov Defense", /e4 e5 Nf3 Nf6/],
    ["Four Knights", /e4 e5 Nf3 Nc6 Nc3 Nf6/],
    ["Vienna Game", /e4 e5 Nc3/],
    ["Dutch Defense", /d4 f5/],
    ["Benoni Defense", /d4 Nf6 c4 c5/],
    ["London System", /d4 d5 Nf3 Nf6 Bf4/],
    ["English Opening", /^c4/],
  ];
  for (const [name, pattern] of openings) {
    if (pattern.test(line)) { document.getElementById('opening-name').textContent = name; return; }
  }
  document.getElementById('opening-name').textContent = state.headers.ECO || 'Unknown Opening';
}

// ─── EVENT LISTENERS ───
document.addEventListener('DOMContentLoaded', function() {
  // Keyboard navigation
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') { goToMoveWithCoach(state.currentMove + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { goToMoveWithCoach(state.currentMove - 1); e.preventDefault(); }
    if (e.key === 'ArrowUp')    { goToMove(0); e.preventDefault(); }
    if (e.key === 'ArrowDown')  { goToMove(state.totalMoves); e.preventDefault(); }
  }, true);

  // Eval chart click
  const canvas = document.getElementById('eval-chart');
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / canvas.width;
    goToMove(Math.round(pct * state.totalMoves));
    drawEvalChart();
  });

  // Settings modal close on backdrop
  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });

  // Voice speed slider
  document.getElementById('voice-speed').addEventListener('input', function() {
    document.getElementById('speed-display').textContent = parseFloat(this.value).toFixed(1) + '\u00d7';
  });

  // Load voices
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
    populateVoices();
  }

  // Onboarding
  if (!localStorage.getItem('ke_onboarded')) {
    document.getElementById('onboarding-modal').classList.add('open');
  } else if (currentCoachType === 'webllm' && llmConsented) {
    const savedModel = localStorage.getItem('ke_model') || 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
    if (window.initWebLLMEngine) window.initWebLLMEngine(savedModel, true);
  }

  updateCoachUI();
});

// Resize handler
window.addEventListener('resize', () => {
  if (document.getElementById('analyzer').classList.contains('visible')) {
    initBoard(); renderBoard(); drawEvalChart();
  }
});
