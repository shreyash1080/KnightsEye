// ─── PARALLEL STOCKFISH ENGINE POOL ───

const sfWorkers = [];
let engineQueue = [];
let completedEvals = 0;

async function createStockfishWorker() {
  try {
    const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
    if (!resp.ok) throw new Error('Blocked by browser');
    const text = await resp.text();
    const blob = new Blob([text], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return new Worker(url);
  } catch (e) {
    throw new Error('Your browser blocked the engine. Try disabling shields/extensions or use Chrome/Firefox.');
  }
}

async function initEnginePool() {
  const numWorkers = Math.min(4, navigator.hardwareConcurrency || 2);
  for (let i = 0; i < numWorkers; i++) {
    if (sfWorkers.length >= numWorkers) break;
    try {
      const w = await createStockfishWorker();
      await new Promise(resolve => {
        w.onmessage = (e) => { if (e.data === 'uciok') resolve(); };
        w.postMessage('uci');
      });
      await new Promise(resolve => {
        w.onmessage = (e) => { if (e.data === 'readyok') resolve(); };
        w.postMessage('setoption name MultiPV value 2');
        w.postMessage('isready');
      });
      sfWorkers.push({ worker: w, isBusy: false, id: i });
    } catch (e) {
      console.error('Worker spawn failed', e);
    }
  }
}

async function runEngineAnalysis() {
  if (sfWorkers.length === 0) {
    // Indicate engine booting gently in the bottom status bar!
    setStatus('Booting engines...', 'active');
    try {
      await initEnginePool();
    } catch (e) {
      setStatus('Engine load failed', 'idle');
      showErrorModal('Engine Blocked', e.message);
      return;
    }
  }

  state.analyzing = true;
  completedEvals = 0;

  engineQueue = [];
  for (let i = 0; i < state.moves.length; i++) {
    engineQueue.push(i);
  }

  processEngineQueue();
}

function processEngineQueue() {
  if (engineQueue.length === 0) return;

  const currentViewIdx = engineQueue.indexOf(state.currentMove);
  if (currentViewIdx > -1) {
    const val = engineQueue.splice(currentViewIdx, 1)[0];
    engineQueue.unshift(val);
  }

  const freeWorkers = sfWorkers.filter(w => !w.isBusy);

  while (freeWorkers.length > 0 && engineQueue.length > 0) {
    const workerObj = freeWorkers.pop();
    const idx = engineQueue.shift();

    workerObj.isBusy = true;
    const moveData = state.moves[idx];

    analyzePosition(workerObj.worker, moveData.fen, 12).then(result => {
      moveData.eval = result.eval;
      moveData.bestMove = result.bestMove;
      moveData.engineLines = result.lines;
      state.evalHistory[idx] = result.eval;

      if (idx > 0) classifyMove(idx);

      completedEvals++;
      const pct = Math.round((completedEvals / state.moves.length) * 100);
      document.getElementById('progress-fill').style.width = pct + '%';

      if (idx === state.currentMove) updateRightPanel(idx);
      updateMoveClassification(idx);
      updateAccuracyScores();
      drawEvalChart();

      setStatus('Analyzing move ' + completedEvals + '/' + state.moves.length + ' (' + pct + '%)', 'active');

      workerObj.isBusy = false;

      if (completedEvals === state.moves.length) {
        state.analyzing = false;
        setStatus('Analysis complete', 'done');
        document.getElementById('status-dot').className = 'status-dot done';
        document.getElementById('progress-fill').style.width = '100%';
        buildClassSummary();
        precomputeAllCoachResponses();
      } else {
        processEngineQueue();
      }
    });
  }
}

function analyzePosition(sf, fen, depth) {
  return new Promise(resolve => {
    const lines = {};
    let bestMove = null;

    const messageHandler = (e) => {
      const msg = e.data;

      if (msg.startsWith('info') && msg.includes('score') && msg.includes('pv')) {
        const pvMatch = msg.match(/multipv (\d+)/);
        const pvNum = pvMatch ? parseInt(pvMatch[1]) : 1;
        const scoreMatch = msg.match(/score (cp|mate) (-?\d+)/);
        const pvMoves = msg.match(/pv (.+)/)?.[1]?.split(' ').slice(0, 5) || [];
        const depthMatch = msg.match(/depth (\d+)/);
        const d = depthMatch ? parseInt(depthMatch[1]) : 0;

        if (scoreMatch && d >= Math.min(depth - 2, 8)) {
          const type = scoreMatch[1];
          const val = parseInt(scoreMatch[2]);
          let evalScore = (type === 'mate') ? (val > 0 ? 10000 : -10000) : val;
          const isBlack = fen.split(' ')[1] === 'b';
          const normalizedEval = isBlack ? -evalScore : evalScore;

          lines[pvNum] = {
            eval: normalizedEval,
            rawEval: val,
            type,
            moves: pvMoves,
            displayEval: formatEval(normalizedEval, type, val),
          };
        }
      }

      if (msg.startsWith('bestmove')) {
        const bm = msg.split(' ')[1];
        bestMove = bm !== '(none)' ? bm : null;
        const primary = lines[1];
        sf.removeEventListener('message', messageHandler);
        resolve({
          eval: primary ? primary.eval : 0,
          bestMove,
          lines: Object.values(lines).sort((a, b) => b.eval - a.eval),
        });
      }
    };

    sf.addEventListener('message', messageHandler);
    sf.postMessage('stop');
    sf.postMessage('position fen ' + fen);
    sf.postMessage('go depth ' + depth);
  });
}

function formatEval(cp, type, rawVal) {
  if (type === 'mate') return 'M' + Math.abs(rawVal);
  const v = cp / 100;
  return (v > 0 ? '+' : '') + v.toFixed(2);
}

function classifyMove(idx) {
  const prev = state.moves[idx - 1];
  const curr = state.moves[idx];
  if (prev.eval === null || curr.eval === null) return;

  const prevEval = prev.eval;
  const currEval = curr.eval;
  const color = curr.color;

  let cpLoss = color === 'w' ? (prevEval - currEval) : (currEval - prevEval);
  curr.cpLoss = Math.max(0, cpLoss);

  const bestMoveUci = prev.bestMove;
  const playedFrom = curr.from + curr.to;
  const isBest = bestMoveUci && playedFrom === bestMoveUci.substring(0, 4);

  let classification;
  const loss = curr.cpLoss;

  if (isBest && loss < 10) classification = 'best';
  else if (loss < 5) classification = 'best';
  else if (loss < 20) classification = 'excellent';
  else if (loss < 50) classification = 'good';
  else if (loss < 100) classification = 'inaccuracy';
  else if (loss < 200) classification = 'mistake';
  else classification = 'blunder';

  if (!isBest && loss < 15 && Math.abs(prevEval) > 50) classification = 'excellent';
  curr.classification = classification;
}