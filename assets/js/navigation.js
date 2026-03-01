// ─── NAVIGATION & MOVE LIST ───

function goToMove(idx) {
  idx = Math.max(0, Math.min(idx, state.totalMoves));
  state.currentMove = idx;
  renderBoard();
  highlightCurrentMove();
  updateRightPanel(idx);
  if (state.analyzing && engineQueue.includes(idx)) processEngineQueue();
  if (voiceMovesEnabled && idx > 0) {
    const mv = state.moves[idx];
    const moveNum = Math.ceil(idx / 2);
    const colorWord = mv.color === 'w' ? 'White' : 'Black';
    setTimeout(() => speakMoveOnly(moveNum + '. ' + colorWord + ': ' + mv.san), 50);
  }
}

function prevMove() { goToMove(state.currentMove - 1); }
function nextMove() { goToMove(state.currentMove + 1); }

function flipBoard() {
  state.flipped = !state.flipped;
  const h = state.headers;
  if (state.flipped) {
    document.getElementById('top-player-name').textContent = h.White || 'White';
    document.getElementById('bottom-player-name').textContent = h.Black || 'Black';
    document.getElementById('top-player-label').querySelector('.piece-icon').className = 'piece-icon w';
    document.getElementById('top-player-label').querySelector('.piece-icon').textContent = '\u2659';
    document.getElementById('bottom-player-label').querySelector('.piece-icon').className = 'piece-icon b';
    document.getElementById('bottom-player-label').querySelector('.piece-icon').textContent = '\u265f';
  } else {
    document.getElementById('top-player-name').textContent = h.Black || 'Black';
    document.getElementById('bottom-player-name').textContent = h.White || 'White';
    document.getElementById('top-player-label').querySelector('.piece-icon').className = 'piece-icon b';
    document.getElementById('top-player-label').querySelector('.piece-icon').textContent = '\u265f';
    document.getElementById('bottom-player-label').querySelector('.piece-icon').className = 'piece-icon w';
    document.getElementById('bottom-player-label').querySelector('.piece-icon').textContent = '\u2659';
  }
  renderBoard();
}

function renderMoveList() {
  const list = document.getElementById('move-list');
  list.innerHTML = '';
  const moves = state.moves.slice(1);
  for (let i = 0; i < moves.length; i += 2) {
    const pair = document.createElement('div');
    pair.className = 'move-pair';
    const num = document.createElement('div');
    num.className = 'move-num';
    num.textContent = (Math.floor(i / 2) + 1) + '.';
    pair.appendChild(num);
    pair.appendChild(createMoveButton(i + 1, moves[i]));
    if (moves[i + 1]) pair.appendChild(createMoveButton(i + 2, moves[i + 1]));
    else pair.appendChild(document.createElement('div'));
    list.appendChild(pair);
  }
  highlightCurrentMove();
}

function createMoveButton(idx, moveData) {
  const btn = document.createElement('button');
  btn.className = 'move-btn';
  btn.dataset.moveIdx = idx;
  btn.onclick = () => goToMoveWithCoach(idx);
  const dot = document.createElement('span');
  dot.className = 'move-class-icon';
  dot.dataset.classIcon = idx;
  dot.style.background = moveData.classification ? (CLASS_INFO[moveData.classification]?.color || 'transparent') : 'var(--bg-4)';
  btn.appendChild(dot);
  const text = document.createElement('span');
  text.textContent = moveData.san || '...';
  btn.appendChild(text);
  return btn;
}

function updateMoveClassification(idx) {
  if (idx <= 0) return;
  const moveData = state.moves[idx];
  const dot = document.querySelector('[data-class-icon="' + idx + '"]');
  if (dot && moveData.classification) dot.style.background = CLASS_INFO[moveData.classification]?.color || 'var(--bg-4)';
}

function highlightCurrentMove() {
  document.querySelectorAll('.move-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector('.move-btn[data-move-idx="' + state.currentMove + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active');
    const list = document.getElementById('move-list');
    if (list) {
      const btnTop = activeBtn.offsetTop;
      const listScrollTop = list.scrollTop;
      const listHeight = list.clientHeight;
      if (btnTop < listScrollTop || btnTop > listScrollTop + listHeight - 40) {
        list.scrollTo({ top: Math.max(0, btnTop - (listHeight / 2)), behavior: 'smooth' });
      }
    }
  }
  const navInd = document.getElementById('nav-indicator');
  if (state.currentMove === 0) {
    navInd.textContent = 'Start';
  } else {
    const mv = state.moves[state.currentMove];
    navInd.textContent = Math.ceil(state.currentMove / 2) + '. ' + (mv.color === 'w' ? '\u2b1c' : '\u2b1b') + ' ' + (mv.san || '');
  }
}

function goToMoveWithCoach(idx) {
  goToMove(idx);
  const autoCoach = localStorage.getItem('ke_auto_coach') === 'true';
  const autoMode = localStorage.getItem('ke_auto_mode') || 'all';
  if (!autoCoach || idx === 0) return;
  const moveData = state.moves[idx];
  if (!moveData || !moveData.classification) return;
  const trigger = {
    all: ['brilliant', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder', 'book', 'forced'],
    blunders: ['blunder'],
    mistakes: ['blunder', 'mistake'],
    inaccuracies: ['blunder', 'mistake', 'inaccuracy'],
  }[autoMode] || [];
  if (autoMode === 'all' || trigger.includes(moveData.classification)) {
    setTimeout(function() { askCoach(idx); }, 100);
  }
}

function updateRightPanel(idx) {
  const moveData = state.moves[idx];
  const prevMoveData = state.moves[idx - 1]; // Grab the previous state to see what we SHOULD have played
  const detail = document.getElementById('move-detail');

  if (idx === 0) {
    detail.innerHTML = '<div style="color:var(--text-2);font-size:12px;text-align:center;padding:10px 0">Starting position \u2014 ' + (state.headers.Event || 'Chess Game') + '</div>';
    document.getElementById('engine-lines-content').innerHTML = '';
    return;
  }

  const cls = moveData.classification;
  const clsInfo = cls ? CLASS_INFO[cls] : null;
  const prevEval = prevMoveData?.eval;
  const currEval = moveData.eval;

  // The alternative "best move" is what the engine recommended BEFORE we made our current move
  const suggestedBestMove = prevMoveData ? prevMoveData.bestMove : null;
  const suggestedEval = (prevMoveData && prevMoveData.engineLines && prevMoveData.engineLines[0]) ? prevMoveData.engineLines[0].displayEval : '';

  detail.innerHTML =
    '<div class="move-detail-header">' +
    (clsInfo ? '<span class="move-classification" style="background:' + clsInfo.bg + ';color:' + clsInfo.color + '">' + clsInfo.label + '</span>' : '<span class="move-classification" style="background:var(--bg-3);color:var(--text-2)">Analyzing...</span>') +
    '</div>' +
    '<div class="move-notation">' + Math.ceil(idx / 2) + (moveData.color === 'w' ? '.' : '...') + ' ' + (moveData.san || '') + '</div>' +
    '<div class="eval-detail" style="margin-top:10px">' +
    '<div class="eval-item"><div class="eval-item-label">Before</div><div class="eval-item-value ' + (prevEval > 0 ? 'pos' : prevEval < 0 ? 'neg' : '') + '">' + (prevEval !== null && prevEval !== undefined ? formatEvalDisplay(prevEval) : '\u2014') + '</div></div>' +
    '<div class="eval-item"><div class="eval-item-label">After</div><div class="eval-item-value ' + (currEval > 0 ? 'pos' : currEval < 0 ? 'neg' : '') + '">' + (currEval !== null && currEval !== undefined ? formatEvalDisplay(currEval) : '\u2014') + '</div></div>' +
    '<div class="eval-item"><div class="eval-item-label">CP Loss</div><div class="eval-item-value ' + (moveData.cpLoss > 100 ? 'neg' : moveData.cpLoss > 30 ? '' : 'pos') + '">' + (moveData.cpLoss !== null && moveData.cpLoss !== undefined ? moveData.cpLoss.toFixed(0) : '\u2014') + '</div></div>' +
    '<div class="eval-item"><div class="eval-item-label">Best Move</div><div class="eval-item-value" style="font-size:12px">' + (suggestedBestMove ? formatUciArrow(suggestedBestMove) : '\u2014') + '</div></div>' +
    '</div>' +
    // FIX: Show the "Engine best" box anytime the move played was NOT "best" or "brilliant"
    (suggestedBestMove && moveData.classification && !['best','brilliant'].includes(moveData.classification) ?
      '<div class="best-move-note">Engine best: <strong>' + formatUciArrow(suggestedBestMove) + '</strong>' + (suggestedEval ? ' (eval ' + suggestedEval + ')' : '') + '</div>' : '');

  const linesEl = document.getElementById('engine-lines-content');
  
  if (moveData.engineLines && moveData.engineLines.length > 0) {
    linesEl.innerHTML = moveData.engineLines.map(line =>
      '<div class="engine-line"><div class="engine-line-eval">' + (line.displayEval || '\u2014') + '</div><div class="engine-line-moves">' + formatEngineLineMoves(idx, line.moves) + '</div></div>'
    ).join('');
  } else {
    linesEl.innerHTML = '<div style="color:var(--text-2);font-size:11px">Calculating...</div>';
  }
}

function formatEvalDisplay(cp) {
  if (Math.abs(cp) >= 9999) return cp > 0 ? 'Mate+' : 'Mate-';
  const v = cp / 100;
  return (v > 0 ? '+' : '') + v.toFixed(2);
}

function formatUciArrow(uci) {
  if (!uci || uci.length < 4) return uci || '\u2014';
  const fromSq = uci.substring(0, 2);
  const toSq = uci.substring(2, 4);
  const promo = uci.length > 4 ? '=' + uci[4].toUpperCase() : '';
  return fromSq + ' &rarr; ' + toSq + promo;
}

function uciToSan(fenIdx, uci) {
  if (!uci || uci.length < 4) return uci || '\u2014';
  try {
    const chess = new Chess(state.moves[fenIdx].fen);
    const move = chess.move({ from: uci.substring(0, 2), to: uci.substring(2, 4), promotion: uci[4] || 'q' });
    return move ? move.san : uci;
  } catch { return uci; }
}

function formatEngineLineMoves(fenIdx, moves) {
  if (!moves || !moves.length) return '\u2014';
  try {
    const chess = new Chess(state.moves[fenIdx].fen);
    const sans = [];
    for (let i = 0; i < Math.min(moves.length, 5); i++) {
      const uci = moves[i];
      const turnStr = chess.turn();
      const currentFullMove = Math.floor((fenIdx + i) / 2) + 1;
      const m = chess.move({ from: uci.substring(0, 2), to: uci.substring(2, 4), promotion: uci[4] || 'q' });
      if (!m) break;
      if (turnStr === 'w') { sans.push(currentFullMove + '.'); } 
      else if (i === 0) { sans.push(currentFullMove + '...'); }
      sans.push(m.san);
    }
    return sans.join(' ');
  } catch { return moves.slice(0, 5).join(' '); }
}

function updateAccuracyScores() {
  const fmt = v => v !== null ? v.toFixed(1) + '%' : '\u2014';
  document.getElementById('white-accuracy').textContent = fmt(calcAccuracy('w'));
  document.getElementById('black-accuracy').textContent = fmt(calcAccuracy('b'));
}

function calcAccuracy(color) {
  const moves = state.moves.filter(m => m.color === color && m.cpLoss !== null);
  if (!moves.length) return null;
  const avgLoss = moves.reduce((s, m) => s + m.cpLoss, 0) / moves.length;
  return Math.max(0, Math.min(100, 100 - Math.sqrt(avgLoss) * 4));
}

function buildClassSummary() {
  const counts = { brilliant:0, best:0, excellent:0, good:0, inaccuracy:0, mistake:0, blunder:0 };
  state.moves.slice(1).forEach(m => {
    if (m.classification && counts[m.classification] !== undefined) counts[m.classification]++;
  });
  const container = document.getElementById('class-summary');
  container.style.display = 'grid';
  container.innerHTML = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) =>
    '<div class="class-item"><div class="class-dot" style="background:' + CLASS_INFO[k].color + '"></div><span>' + CLASS_INFO[k].label.replace(/^[!\u2713\u2726\u00b7?! ?]{1,2} /, '') + '</span><span class="class-count">' + v + '</span></div>'
  ).join('');
}