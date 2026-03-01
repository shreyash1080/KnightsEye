// ─── AI COACH ───

function buildAIPrompt(idx) {
  const curr = state.moves[idx];
  const prev = state.moves[idx - 1];
  const moveNum = Math.ceil(idx / 2);
  const colorStr = curr.color === 'w' ? 'White' : 'Black';
  const cls = curr.classification || 'unknown';
  const bestSan = prev && prev.bestMove ? uciToSan(idx - 1, prev.bestMove) : null;
  const openingName = document.getElementById('opening-name').textContent;

  if (['blunder','mistake','inaccuracy'].includes(cls)) {
    return 'Game: ' + openingName + '. Move ' + moveNum + ': ' + colorStr + ' played ' + curr.san + '. Engine called this a ' + cls + ' (lost ' + curr.cpLoss + ' centipawns). Best move was ' + bestSan + '. Briefly explain WHY ' + curr.san + ' was wrong and why ' + bestSan + ' is better. Under 50 words. Casual tone.';
  } else if (idx <= 12) {
    return 'Game: ' + openingName + '. Move ' + moveNum + ': ' + colorStr + ' played ' + curr.san + '. Briefly explain the strategic idea of this opening move. Under 50 words. Casual tone.';
  } else {
    return 'Move ' + moveNum + ': ' + colorStr + ' played ' + curr.san + '. Engine rated this as ' + cls + '. Briefly explain the strategic idea or tactic. Under 50 words. Casual tone.';
  }
}

function getRandomPhrase(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getPieceName(san) {
  if (!san) return 'piece';
  if ('NBRQK'.includes(san[0])) return { n:'knight', b:'bishop', r:'rook', q:'queen', k:'king' }[san[0].toLowerCase()];
  return 'pawn';
}

function buildRuleBasedCoach(idx) {
  const curr = state.moves[idx];
  const prev = state.moves[idx - 1];
  if (!curr) return 'No data yet.';
  const moveNum = Math.ceil(idx / 2);
  const colorStr = curr.color === 'w' ? 'White' : 'Black';
  const pieceName = getPieceName(curr.san);
  const cls = curr.classification || 'good';
  const cpLoss = curr.cpLoss || 0;
  const bestSan = prev && prev.bestMove ? uciToSan(idx - 1, prev.bestMove) : null;
  const isCapture = curr.san && curr.san.includes('x');
  const isCastle = curr.san && curr.san.startsWith('O');
  const isCheck = curr.san && curr.san.includes('+');
  const opening = document.getElementById('opening-name').textContent || '';

  if (idx <= 12 && ['best','excellent','good','book'].includes(cls)) {
    return getRandomPhrase(["Textbook development.","Standard theory.","Following main ideas here.","Solid opening play."]) + ' ' + curr.san + ' fits well into the ' + opening + ' concepts. Focus on controlling the center, developing pieces, and king safety.';
  } else if (['brilliant','best'].includes(cls)) {
    const ctx = isCastle ? "Securing the king was top priority." : isCapture ? "Trading or winning material here is exactly right." : isCheck ? "Forcing the king to move disrupts their coordination." : "Developing the " + pieceName + " here creates excellent pressure.";
    return getRandomPhrase(["Textbook. Playing " + curr.san + " is the engine's top choice.","Absolutely nailed it! " + curr.san + " is the best move here.","Perfect decision \u2014 " + curr.san + " is what Stockfish recommends."]) + ' ' + ctx + ' Keep up this precision!';
  } else if (cls === 'excellent') {
    return getRandomPhrase(["Really nice practical move!","Strong, ambitious play!","Love the confidence here."]) + ' ' + curr.san + ' might not be the absolute top computer line (Stockfish prefers ' + bestSan + '), but in a real game this creates tough problems for your opponent.';
  } else if (cls === 'good') {
    return getRandomPhrase(["Solid, nothing wrong here.","Keeping the tension alive.","Safe, structural choice."]) + ' ' + curr.san + ' is completely fine. For a tiny extra edge, consider ' + bestSan + ' next time, but what you played is very solid.';
  } else if (cls === 'inaccuracy') {
    return getRandomPhrase(["Slight slip here.","You let the advantage slip a bit.","A touch too passive."]) + ' ' + curr.san + ' drops ~' + cpLoss + ' centipawns. Playing ' + bestSan + ' instead would have seized the initiative faster. Keep your pieces active!';
  } else if (cls === 'mistake') {
    return getRandomPhrase(["Ouch, this creates real headaches.","You\u2019ll want this one back.","A definite mistake."]) + ' ' + curr.san + ' gave up crucial board control. ' + (isCapture ? "That capture opens dangerous lines against you." : "Moving the " + pieceName + " here ignores their main threat.") + ' Engine wanted ' + bestSan + '. Always check for checks and captures first!';
  } else if (cls === 'blunder') {
    return getRandomPhrase(["Oh no! Devastating blunder.","Catastrophic slip.","This completely loses the thread."]) + ' ' + curr.san + ' throws away the game. ' + (cpLoss >= 300 ? "You hung a piece, missed a forced mate, or walked into a brutal tactic." : "This shatters your position.") + ' Only ' + bestSan + ' could survive. Take an extra 5 seconds on critical decisions!';
  }
  return 'Still calculating depth for ' + curr.san + '. Click Ask Coach again in a moment.';
}

async function precomputeAllCoachResponses() {
  for (let i = 1; i <= state.totalMoves; i++) {
    if (!coachCache[i + '_basic']) {
      coachCache[i + '_basic'] = { text: buildRuleBasedCoach(i), isAI: false };
    }
  }

  if (currentCoachType === 'webllm' && window.webllmEngine && !isPrecomputingLLM) {
    isPrecomputingLLM = true;
    const autoMode = localStorage.getItem('ke_auto_mode') || 'all';
    const trigger = { all: ['brilliant','best','excellent','good','inaccuracy','mistake','blunder','book','forced'], blunders: ['blunder'], mistakes: ['blunder','mistake'], inaccuracies: ['blunder','mistake','inaccuracy'] }[autoMode] || [];

    for (let i = 1; i <= state.totalMoves; i++) {
      const mv = state.moves[i];
      if (mv && mv.classification && (autoMode === 'all' || trigger.includes(mv.classification))) {
        precomputeQueue.push(i);
      }
    }

    while (precomputeQueue.length > 0) {
      const idx = precomputeQueue.shift();
      const cacheKey = idx + '_webllm';
      if (!coachCache[cacheKey]) {
        try {
          const styleP = { friendly: 'You are a warm, encouraging chess coach.', strict: 'You are a direct, no-nonsense Russian Grandmaster chess coach.', socratic: 'You are a Socratic chess coach. Guide the player with questions.' }[localStorage.getItem('ke_coach_style') || 'friendly'];
          const reply = await window.webllmEngine.chat.completions.create({
            messages: [{ role: 'system', content: styleP + ' Under 50 words. No markdown.' }, { role: 'user', content: buildAIPrompt(idx) }],
            temperature: 0.5, max_tokens: 100,
          });
          coachCache[cacheKey] = { text: reply.choices[0].message.content, isAI: true };
        } catch(e) { console.warn('Pre-compute failed for move ' + idx, e); }
      }
    }
    isPrecomputingLLM = false;
  }
}

async function askCoach(forceIdx) {
  if (isGenerating) return;
  switchTab('coach');
  const idx = forceIdx !== undefined ? forceIdx : state.currentMove;
  const coachResp = document.getElementById('coach-response');

  if (idx === 0 || !state.moves[idx]) {
    coachResp.innerHTML = '<div style="padding:16px;color:var(--text-2);font-size:12px">Navigate to a move first to get coaching.</div>';
    return;
  }

  // Double check protection: Just bail out if AI is downloading
  if (currentCoachType === 'webllm' && !window.webllmEngine) return;

  const cacheKey = idx + '_' + currentCoachType;
  if (coachCache[cacheKey]) {
    renderCoachMessage(coachCache[cacheKey].text, idx, coachCache[cacheKey].isAI);
    if (voiceEnabled) speak(coachCache[cacheKey].text);
    return;
  }

  const moveData = state.moves[idx];
  if (moveData.eval === null) {
    coachResp.innerHTML = '<div style="padding:16px;color:var(--text-2);font-size:12px">\u23f3 Still analyzing\u2026 please wait a moment.</div>';
    return;
  }

  const btn = document.getElementById('coach-ask-btn');
  btn.disabled = true;

  if (currentCoachType === 'basic' || !window.webllmEngine) {
    const ruleText = buildRuleBasedCoach(idx);
    coachCache[cacheKey] = { text: ruleText, isAI: false };
    renderCoachMessage(ruleText, idx, false);
    if (voiceEnabled) speak(ruleText);
    btn.disabled = false;
  } else {
    isGenerating = true;
    try {
      renderCoachMessage('...', idx, true);
      const streamEl = document.getElementById('coach-stream-text');
      const styleP = { friendly: 'You are a warm, encouraging chess coach.', strict: 'You are a direct, no-nonsense Russian Grandmaster chess coach.', socratic: 'You are a Socratic chess coach. Guide the player with questions.' }[localStorage.getItem('ke_coach_style') || 'friendly'];

      const chunks = await window.webllmEngine.chat.completions.create({
        messages: [{ role: 'system', content: styleP + ' Under 50 words. No markdown.' }, { role: 'user', content: buildAIPrompt(idx) }],
        temperature: 0.5, max_tokens: 100, stream: true,
      });

      let fullText = '';
      for await (const chunk of chunks) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          if (streamEl) streamEl.innerHTML = escapeHtml(fullText) + '<span class="stream-cursor"></span>';
        }
      }

      if (fullText) {
        coachCache[cacheKey] = { text: fullText, isAI: true };
        renderCoachMessage(fullText, idx, true);
        if (voiceEnabled) speak(fullText);
      }
    } catch (e) {
      console.error("WebLLM Generation Error:", e);
      const ruleText = buildRuleBasedCoach(idx);
      coachCache[cacheKey] = { text: ruleText, isAI: false };
      renderCoachMessage("⚠️ AI failed to generate. " + ruleText, idx, false);
      if (voiceEnabled) speak(ruleText);
    }
    btn.disabled = false;
    isGenerating = false;
  }
}

function renderCoachMessage(text, idx, isAI) {
  const curr = state.moves[idx];
  const cls = (curr && curr.classification) || 'unknown';
  const clsInfo = CLASS_INFO[cls];
  const moveNum = Math.ceil(idx / 2);
  const colorStr = curr && curr.color === 'w' ? 'White' : 'Black';
  const cpLoss = curr && curr.cpLoss;
  const prev = state.moves[idx - 1];
  const bestSan = prev && prev.bestMove ? uciToSan(idx - 1, prev.bestMove) : null;
  const showArrow = bestSan && !['best','excellent','brilliant'].includes(cls);

  document.getElementById('coach-response').innerHTML =
    '<div style="padding:14px">' +
    '<div class="coach-message">' +
    '<div class="coach-message-header">' +
    '<div style="width:22px;height:22px;border-radius:50%;background:var(--bg-3);border:1px solid var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:12px"><svg class="robo-icon" viewBox="0 0 24 24" style="color:var(--accent);"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 0 1 3 3v2h2v4h-2v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2H2v-4h2V10a3 3 0 0 1 3-3h3V5.73A2 2 0 1 1 12 2zm3 13H9v2h6v-2zm-4-4H9v2h2v-2zm5 0h-2v2h2v-2z"/></svg></div>' +
    '<span>Coach \u2014 Move ' + moveNum + ' ' + colorStr + ' \u00b7 ' + (curr && curr.san || '') + '</span>' +
    '<span style="font-size:9px;color:var(--text-2);margin-left:auto">' + (isAI ? '\ud83e\udd16 AI Coach' : '\u26a1 Stockfish + Rules') + '</span>' +
    '</div>' +
    '<div class="coach-context-pill" style="background:' + (clsInfo?.bg || 'var(--bg-3)') + ';color:' + (clsInfo?.color || 'var(--text-2)') + '">' +
    (clsInfo?.label || cls) + (cpLoss != null ? ' \u00b7 \u2212' + cpLoss.toFixed(0) + ' cp' : '') +
    '</div>' +
    (showArrow ?
      '<div style="margin:8px 0;padding:7px 10px;background:rgba(27,172,166,0.12);border-left:3px solid #1baca6;border-radius:0 6px 6px 0;font-size:12px;color:var(--text-1)">' +
      '\u2197 Better move: <strong style="color:#1baca6;font-family:JetBrains Mono,monospace">' + bestSan + '</strong>' +
      '<span style="font-size:10px;color:var(--text-2);display:block;margin-top:2px">\ud83d\udfe0 orange = played &nbsp;\u00b7&nbsp; \ud83d\udfe2 green = better</span>' +
      '</div>' : '') +
    '<div id="coach-stream-text">' + escapeHtml(text) + '</div>' +
    '</div></div>';
}