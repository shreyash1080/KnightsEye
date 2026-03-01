// ─── GLOBAL STATE ───
const state = {
  moves: [],
  currentMove: 0,
  totalMoves: 0,
  flipped: false,
  analyzing: false,
  pgn: '',
  headers: {},
  evalHistory: [],
};

// Settings state
let currentCoachType = localStorage.getItem('ke_coach_type') || 'basic';
let llmConsented = localStorage.getItem('ke_llm_consented') === 'true';
let voiceEnabled = localStorage.getItem('ke_voice_enabled') === 'true';
let voiceMovesEnabled = localStorage.getItem('ke_voice_moves') === 'true';

// Coach cache & pre-compute
let coachCache = {};
let isGenerating = false;
let precomputeQueue = [];
let isPrecomputingLLM = false;

// WebLLM explicitly attached to window for cross-module access
window.webllmEngine = null;

const CLASS_INFO = {
  'brilliant':  { color: '#1baca6', label: '!! Brilliant',  bg: 'rgba(27,172,166,0.15)' },
  'best':        { color: '#5cb85c', label: '✓ Best',        bg: 'rgba(92,184,92,0.15)'  },
  'excellent':  { color: '#88c544', label: '✦ Excellent',   bg: 'rgba(136,197,68,0.15)' },
  'good':        { color: '#b8d95e', label: '· Good',        bg: 'rgba(184,217,94,0.12)' },
  'inaccuracy': { color: '#f0c040', label: '?! Inaccuracy', bg: 'rgba(240,192,64,0.15)' },
  'mistake':    { color: '#e07820', label: '? Mistake',     bg: 'rgba(224,120,32,0.15)' },
  'blunder':    { color: '#d32f2f', label: '?? Blunder',    bg: 'rgba(211,47,47,0.15)'  },
  'book':        { color: '#9e9e9e', label: '📖 Book',       bg: 'rgba(158,158,158,0.1)' },
  'forced':      { color: '#78909c', label: '→ Forced',      bg: 'rgba(120,144,156,0.1)' },
};

const PIECE_IMGS = {
  'wK': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
  'wQ': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
  'wR': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
  'wB': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
  'wN': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
  'wP': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
  'bK': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
  'bQ': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
  'bR': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
  'bB': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
  'bN': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
  'bP': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
};

const demoPGN = `[Event "January 06 2026"]
[Site ""]
[Date "2026.01.06"]
[Round "?"]
[White "Magnus Carlsen"]
[Black "Yaroslav Shevchenko"]
[Result "1-0"]

1. e3 d5 2. Ke2 Nf6 3. f3 e5 4. Kf2 Nc6 5. Bb5 h5 6. b3 h4 7. Ne2 h3 8. g3 e4 9.
f4 Bg4 10. Bb2 a6 11. Bxc6+ bxc6 12. c4 Bc5 13. Bxf6 Qxf6 14. Nbc3 Bf3 15. cxd5
cxd5 16. b4 Ba7 17. Nxd5 Qd6 18. Ndc3 O-O-O 19. d4 exd3 20. Kxf3 Qc6+ 21. e4
dxe2 22. Qc2 f5 23. Rac1 Rhe8 24. Qxe2 Qg6 25. exf5 Qb6 26. Ne4 Kb8 27. Rhe1 Rd4
28. Qc2 Red8 29. Nc5 Ka8 30. Kg4 g6 31. Ne6 gxf5+ 32. Qxf5 Rg8+ 33. Kxh3 Rd7 34.
Nxc7+ 1-0`;