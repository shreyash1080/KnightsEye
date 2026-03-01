// ─── BOARD RENDERING ───
let squareSize = 60;

function initBoard() {
  const wrapper = document.querySelector('.board-wrapper');
  if (!wrapper) return;
  const maxW = wrapper.clientWidth - 20;
  const maxH = wrapper.clientHeight - 20;
  const available = Math.min(maxW, maxH, 600);
  squareSize = Math.max(30, Math.floor(available / 8));
  const totalSize = (squareSize * 8) + 'px';
  document.getElementById('chess-board').style.width = totalSize;
  document.getElementById('chess-board').style.height = totalSize;
  document.getElementById('arrow-overlay').style.width = totalSize;
  document.getElementById('arrow-overlay').style.height = totalSize;
  document.getElementById('eval-bar').style.height = totalSize;
}

function renderBoard() {
  if (!document.getElementById('chess-board').style.width) initBoard();
  const board = document.getElementById('chess-board');
  board.innerHTML = '';
  const moveData = state.moves[state.currentMove];
  if (!moveData) return;
  const chess = new Chess(moveData.fen);
  const boardState = chess.board();
  const flipped = state.flipped;
  let lastFrom = null, lastTo = null;
  if (state.currentMove > 0) { const mv = state.moves[state.currentMove]; lastFrom = mv.from; lastTo = mv.to; }
  const ranks = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const files = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const fileNames = ['a','b','c','d','e','f','g','h'];
  const rankNames = ['1','2','3','4','5','6','7','8'];
  for (const rank of ranks) {
    for (const file of files) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((rank + file) % 2 === 0 ? 'dark' : 'light');
      sq.style.width = squareSize + 'px'; sq.style.height = squareSize + 'px'; sq.style.position = 'relative';
      const sqName = fileNames[file] + rankNames[rank];
      sq.dataset.square = sqName;
      if (sqName === lastFrom) sq.classList.add('last-from');
      if (sqName === lastTo) sq.classList.add('last-to');
      if ((!flipped && file === 0) || (flipped && file === 7)) { const c = document.createElement('span'); c.className = 'coord coord-rank'; c.textContent = rankNames[rank]; sq.appendChild(c); }
      if ((!flipped && rank === 0) || (flipped && rank === 7)) { const c = document.createElement('span'); c.className = 'coord coord-file'; c.textContent = fileNames[file]; sq.appendChild(c); }
      const piece = boardState[7 - rank][file];
      if (piece) { const key = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase(); const img = document.createElement('div'); img.className = 'piece'; img.style.backgroundImage = 'url(' + PIECE_IMGS[key] + ')'; sq.appendChild(img); }
      board.appendChild(sq);
    }
  }
  updateEvalBar(moveData.eval);
  drawArrows();
  calculateAndDrawMaterial(moveData.fen);
}

function updateEvalBar(evalScore) {
  if (evalScore === null || evalScore === undefined) evalScore = 0;
  const fill = document.getElementById('eval-fill');
  const textBot = document.getElementById('eval-text-bot');
  const textTop = document.getElementById('eval-text-top');
  const clamped = Math.max(-800, Math.min(800, evalScore));
  const pct = 50 + (clamped / 800) * 45;
  const whitePct = state.flipped ? (100 - pct) : pct;
  fill.style.height = Math.max(2, Math.min(98, whitePct)) + '%';
  const displayVal = Math.abs(evalScore) >= 9999 ? ('M' + (evalScore > 0 ? '+' : '-')) : (evalScore / 100 > 0 ? '+' : '') + (evalScore / 100).toFixed(1);
  textBot.textContent = evalScore >= 0 ? displayVal : '';
  textTop.textContent = evalScore < 0 ? displayVal : '';
}

function calculateAndDrawMaterial(fen) {
  const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9 };
  let w = 0, b = 0;
  for (let char of fen.split(' ')[0]) {
    if (pieceValues[char.toLowerCase()]) {
      if (char === char.toUpperCase()) w += pieceValues[char.toLowerCase()];
      else b += pieceValues[char.toLowerCase()];
    }
  }
  const diff = w - b;
  const wEl = document.getElementById('white-material');
  const bEl = document.getElementById('black-material');
  if (wEl && bEl) { wEl.textContent = diff > 0 ? '+' + diff : ''; bEl.textContent = diff < 0 ? '+' + Math.abs(diff) : ''; }
}

function drawArrows() {
  const svg = document.getElementById('arrow-overlay');
  svg.innerHTML = '';
  const idx = state.currentMove;
  if (idx === 0) return;
  const curr = state.moves[idx];
  const prev = state.moves[idx - 1];
  if (curr.from && curr.to) drawArrow(svg, curr.from, curr.to, '#e07820', 0.75);
  if (prev && prev.bestMove && prev.bestMove.length >= 4) {
    const bFrom = prev.bestMove.substring(0, 2);
    const bTo = prev.bestMove.substring(2, 4);
    if (curr.from === bFrom && curr.to === bTo) drawArrow(svg, curr.from, curr.to, '#5cb85c', 0.85);
    else drawArrow(svg, bFrom, bTo, '#1baca6', 0.85);
  }
}

function squareToXY(sq) {
  const fileNames = ['a','b','c','d','e','f','g','h'];
  const file = fileNames.indexOf(sq[0]);
  const rank = parseInt(sq[1]) - 1;
  return { x: (state.flipped ? (7 - file) : file) * squareSize + squareSize / 2, y: (state.flipped ? rank : (7 - rank)) * squareSize + squareSize / 2 };
}

function drawArrow(svg, from, to, color, opacity) {
  const p1 = squareToXY(from), p2 = squareToXY(to);
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const len = Math.sqrt(dx*dx+dy*dy);
  const al = squareSize * 0.35, aw = squareSize * 0.13;
  const ux = dx/len, uy = dy/len;
  const ex = p2.x - ux*al, ey = p2.y - uy*al;
  const px = -uy, py = ux;
  const pts = [
    (p1.x+px*aw*0.6)+','+(p1.y+py*aw*0.6),
    (ex+px*aw*0.6)+','+(ey+py*aw*0.6),
    (ex+px*al*0.5)+','+(ey+py*al*0.5),
    p2.x+','+p2.y,
    (ex-px*al*0.5)+','+(ey-py*al*0.5),
    (ex-px*aw*0.6)+','+(ey-py*aw*0.6),
    (p1.x-px*aw*0.6)+','+(p1.y-py*aw*0.6),
  ].join(' ');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', pts); poly.setAttribute('fill', color); poly.setAttribute('opacity', opacity);
  svg.appendChild(poly);
}

function drawEvalChart() {
  const canvas = document.getElementById('eval-chart');
  if (!canvas || !canvas.parentElement) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.clientWidth - 32, H = 60;
  canvas.width = W; canvas.height = H;
  const evals = state.evalHistory.filter(e => e !== null && e !== undefined);
  if (evals.length < 2) return;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a1e25'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2e3545'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  const n = evals.length, xStep = W / (n - 1);
  const clamp = v => Math.max(-600, Math.min(600, v));
  const toY = v => H/2 - (clamp(v)/600) * (H/2 - 4);
  ctx.beginPath(); ctx.moveTo(0, H/2);
  for (let i = 0; i < n; i++) ctx.lineTo(i*xStep, toY(evals[i]));
  ctx.lineTo((n-1)*xStep, H/2); ctx.closePath(); ctx.fillStyle = 'rgba(240,234,216,0.25)'; ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < n; i++) { if (i===0) ctx.moveTo(i*xStep, toY(evals[i])); else ctx.lineTo(i*xStep, toY(evals[i])); }
  ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5; ctx.stroke();
  if (state.currentMove < n) { ctx.beginPath(); ctx.arc(state.currentMove*xStep, toY(evals[state.currentMove]), 3, 0, Math.PI*2); ctx.fillStyle = '#c9a84c'; ctx.fill(); }
  state.moves.slice(1).forEach((m, i) => {
    if (m.classification === 'blunder' && i+1 < n) { ctx.beginPath(); ctx.arc((i+1)*xStep, toY(evals[i+1]), 4, 0, Math.PI*2); ctx.fillStyle = '#d32f2f'; ctx.fill(); }
    else if (m.classification === 'mistake' && i+1 < n) { ctx.beginPath(); ctx.arc((i+1)*xStep, toY(evals[i+1]), 3, 0, Math.PI*2); ctx.fillStyle = '#e07820'; ctx.fill(); }
  });
}
