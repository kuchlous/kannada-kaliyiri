// Revision over everything archived so far, as flashcards or a quiz. Cards are
// deduplicated by Kannada text, so a word met on several days counts once.
import { html, trusted, attrJson } from './escape.js';
import { state } from './state.js';
import { shuffle, showToast } from './ui.js';

let revMode = 'flashcard';

let revQueue = [];

let revIdx = 0;

let quizScore = 0;

let quizTotal = 0;


export function setRevMode(mode, btn) {
  revMode = mode;
  document.querySelectorAll('.rev-mode-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

export function startRevision() {
  // Filter to only valid complete entries (guards against corrupt old localStorage)
  const validEntries = state.archive.filter(e =>
    e && e.lesson && e.lesson.word && e.lesson.sentence &&
    e.lesson.word.kannada && e.lesson.sentence.kannada
  );
  if (!validEntries.length) {
    document.getElementById('revision-area').innerHTML = '<div class="error-state">📚 Complete at least one full lesson first!</div>';
    return;
  }
  // Deduplicate by Kannada text — if ಊಟ appears on Day 1, 3, 5 it counts as ONE card
  const seenKannada = new Set();
  const cards = [];
  validEntries.forEach(entry => {
    const w = entry.lesson.word;
    const s = entry.lesson.sentence;
    if (w.kannada && !seenKannada.has(w.kannada)) {
      seenKannada.add(w.kannada);
      cards.push({ type:'word', data: w, day: entry.day });
    }
    if (s.kannada && !seenKannada.has(s.kannada)) {
      seenKannada.add(s.kannada);
      cards.push({ type:'sentence', data: s, day: entry.day, word: w });
    }
  });
  shuffle(cards);
  revQueue = cards;
  revIdx = 0;
  quizScore = 0;
  quizTotal = 0;

  if (revMode === 'flashcard') {
    showFlashcard();
  } else {
    // Pre-build all quiz questions — one per unique card, no repeats
    quizQuestions = cards.map(card => ({ q: buildQuizQuestion(card), answered: false, chosen: null }));
    quizTotal = 0; quizScore = 0;
    renderQuizQuestion();
  }
}

// ── FLASHCARDS ──
export function showFlashcard() {
  const total = revQueue.length;

  if (total === 0) {
    document.getElementById('revision-area').innerHTML = '<div class="error-state">No cards to show.</div>';
    return;
  }

  // Clamp index
  if (revIdx < 0) revIdx = 0;
  if (revIdx >= total) {
    // All cards done — show completion
    document.getElementById('revision-area').innerHTML = `
      <div class="flashcard" style="border-color:var(--leaf)">
        <div style="font-size:2.4rem;margin-bottom:8px">🎊</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.3rem;color:var(--mud);margin-bottom:6px">All cards reviewed!</div>
        <p style="color:var(--text-light);margin-bottom:14px">You went through all ${total} cards</p>
        <button class="btn btn-primary" onclick="restartFlashcards()">↩ Start Over</button>
      </div>`;
    return;
  }

  const card = revQueue[revIdx];
  const isWord = card.type === 'word';
  const front = card.data.kannada;
  const roman = card.data.transliteration;
  const answer = card.data.meaning;
  const extra = isWord ? (card.data.example || '') : (card.data.breakdown || '');
  const ld = attrJson({kannada:front, transliteration:roman});

  const prevDisabled = revIdx === 0 ? 'disabled' : '';

  document.getElementById('revision-area').innerHTML = html`
    <div class="flashcard">
      <div class="fc-counter">Card ${revIdx+1} of ${total}</div>
      <div class="fc-type ${card.type}">${isWord ? '🌟 Word' : '💬 Sentence'} · Day ${card.day}</div>
      <div class="fc-front ${card.type}">${front}</div>
      <div class="fc-roman">${roman}</div>

      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0 4px">
        <button class="speak-btn" style="font-size:.78rem;padding:8px 14px" onclick='speak(${ld},this)'>🔊 Hear</button>
        <button class="rec-btn" id="fc-rec" style="font-size:.78rem;padding:8px 14px" onclick="toggleFcRec()">🎙 Say it</button>
        <button class="btn btn-secondary" style="font-size:.78rem;padding:8px 14px" onclick="document.getElementById('fc-ans').classList.add('show')">👁 Show Answer</button>
      </div>

      <div id="fc-rec-panel"></div>

      <div class="fc-answer" id="fc-ans">
        <div class="fc-meaning">${answer}</div>
        <div class="fc-extra">${extra}</div>
        <div class="fc-rate">
          <button class="rate-btn hard" onclick="flagHard()">😅 Hard — see again</button>
          <button class="rate-btn easy" onclick="fcNext()">😊 Easy — next</button>
        </div>
      </div>

      <!-- Navigation arrows — always visible -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;gap:10px;">
        <button class="nav-arrow" ${trusted(prevDisabled)} onclick="fcPrev()" title="Previous card">←</button>
        <div style="display:flex;gap:6px;align-items:center;">
          ${Array.from({length:Math.min(total,10)}, (_,i) => {
            const isCurrent = total <= 10 ? i === revIdx : (revIdx >= Math.round(i*(total-1)/9) && (i===9 || revIdx < Math.round((i+1)*(total-1)/9)));
            return html`<div style="width:8px;height:8px;border-radius:50%;background:${isCurrent ? 'var(--saffron)' : 'var(--sand-dark)'};transition:background .2s;"></div>`;
          })}
        </div>
        <button class="nav-arrow" onclick="fcNext()" title="Next card">${revIdx === total-1 ? '✓' : '→'}</button>
      </div>
    </div>`;
}

// Inline handlers cannot assign to module-scoped state once this file is split
// into ES modules — `revIdx=0` in an onclick would write to window instead.
export function restartFlashcards() { revIdx = 0; showFlashcard(); }

export function fcNext() {
  revIdx++;
  showFlashcard();
}

export function fcPrev() {
  if (revIdx > 0) { revIdx--; showFlashcard(); }
}

export function flagHard() {
  // Mark as hard — will be shown again at the end in a separate review pass
  if (revQueue[revIdx]) revQueue[revIdx].hard = true;
  revIdx++;
  // If we just finished the main pass, add hard cards to the end for review
  if (revIdx >= revQueue.length) {
    const hardCards = revQueue.filter(c => c.hard).map(c => ({...c, hard:false}));
    if (hardCards.length) {
      revQueue = [...revQueue, ...hardCards];
      showToast(`🔁 ${hardCards.length} hard card${hardCards.length>1?'s':''} queued for review`);
    }
  }
  showFlashcard();
}

let fcRecOn=false,fcMR=null,fcChunks=[];

export function toggleFcRec(){
  if(fcRecOn){if(fcMR&&fcMR.state!=='inactive')fcMR.stop();fcRecOn=false;const b=document.getElementById('fc-rec');if(b){b.classList.remove('recording');b.textContent='🎙 Say it';}return;}
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    fcChunks=[];fcMR=new MediaRecorder(stream);
    fcMR.ondataavailable=e=>{if(e.data.size>0)fcChunks.push(e.data);};
    fcMR.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const url=URL.createObjectURL(new Blob(fcChunks,{type:'audio/webm'}));const p=document.getElementById('fc-rec-panel');if(p)p.innerHTML=`<audio class="playback" controls src="${url}" style="margin-top:8px"></audio>`;showToast('✅ Recorded!');};
    fcMR.start();fcRecOn=true;const b=document.getElementById('fc-rec');if(b){b.classList.add('recording');b.textContent='⏹ Stop';}showToast('🔴 Recording…');
  }).catch(()=>showToast('⚠️ Mic denied.'));
}

// ── QUIZ ──
// Questions are pre-built once per session and stored, so ← → navigation works
// and answered state is preserved when going back.
let quizQuestions = [];  // [{q, answered, chosen}]

function buildQuizQuestion(card) {
  const reversed = card.type === 'word' && Math.random() < 0.5;
  const validEntries = state.archive.filter(e => e && e.lesson && e.lesson.word && e.lesson.sentence);

  if (!reversed) {
    // FORWARD: Kannada shown → pick correct English meaning
    const correct = card.data.meaning;
    const pool = [...new Set(
      validEntries.flatMap(e => [e.lesson.word.meaning, e.lesson.sentence.meaning])
    )].filter(m => m !== correct);
    shuffle(pool);
    const options = [correct, ...pool.slice(0,3)].map(o => ({ display: o, value: o, roman: null }));
    shuffle(options);
    return {
      reversed: false,
      type: card.type,
      day: card.day,
      question: card.type==='word' ? 'What is the meaning of this Kannada word?' : 'What does this Kannada sentence mean?',
      promptKannada: card.data.kannada,
      promptRoman: card.data.transliteration,
      correct: correct,          // the value to match
      options                    // [{display, value, roman}]
    };
  } else {
    // REVERSED: English meaning shown → pick correct Kannada word
    // Include transliteration for every option
    const correctKn = card.data.kannada;
    const correctRom = card.data.transliteration;
    const pool = validEntries
      .map(e => ({ kn: e.lesson.word.kannada, rom: e.lesson.word.transliteration }))
      .filter(o => o.kn !== correctKn);
    // deduplicate by kn
    const seen = new Set();
    const uniquePool = pool.filter(o => { if(seen.has(o.kn)) return false; seen.add(o.kn); return true; });
    shuffle(uniquePool);
    const options = [
      { display: correctKn, value: correctKn, roman: correctRom },
      ...uniquePool.slice(0,3).map(o => ({ display: o.kn, value: o.kn, roman: o.rom }))
    ];
    shuffle(options);
    return {
      reversed: true,
      type: card.type,
      day: card.day,
      question: 'Which Kannada word matches this meaning?',
      promptEnglish: card.data.meaning,
      promptHint: card.data.example || '',
      correct: correctKn,
      options
    };
  }
}

function showQuiz() {
  const total = quizQuestions.length;

  if (total === 0) {
    document.getElementById('revision-area').innerHTML = '<div class="error-state">No questions built yet.</div>';
    return;
  }

  if (revIdx >= total) {
    const pct = quizTotal > 0 ? Math.round((quizScore/quizTotal)*100) : 0;
    const emoji = pct>=80?'🎉':pct>=60?'👍':'💪';
    const msg = pct>=80?'Excellent!':pct>=60?'Good job!':'Keep practising!';
    document.getElementById('revision-area').innerHTML = `
      <div class="quiz-score">
        <div style="font-size:2.8rem;margin-bottom:10px">${emoji}</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.3rem;color:var(--mud);margin-bottom:8px">Quiz Complete!</div>
        <div style="font-size:2rem;font-weight:700;color:var(--saffron-dark);margin-bottom:4px">${quizScore}/${quizTotal}</div>
        <div style="font-size:.95rem;color:var(--text-light);margin-bottom:18px">${pct}% correct — ${msg}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="startRevision()">🔄 New Quiz</button>
          <button class="btn btn-secondary" onclick="retrySameQuiz()">↩ Retry Same</button>
        </div>
      </div>`;
    return;
  }

  renderQuizQuestion();
}

export function renderQuizQuestion() {
  const total = quizQuestions.length;
  if (revIdx < 0) revIdx = 0;
  if (revIdx >= total) { showQuiz(); return; }

  const entry = quizQuestions[revIdx];
  const q = entry.q;
  const prevDisabled = revIdx === 0 ? 'disabled' : '';

  // Build prompt block
  let promptHTML = '';
  let hearHTML = '';
  if (!q.reversed) {
    const ldObj = attrJson({kannada: q.promptKannada, transliteration: q.promptRoman});
    promptHTML = html`<div class="quiz-kn">${q.promptKannada}</div><div class="quiz-sub">${q.promptRoman}</div>`;
    hearHTML = html`<div style="margin:10px 0 14px"><button class="speak-btn" style="font-size:.76rem;padding:7px 12px" onclick='speak(${ldObj},this)'>🔊 Hear</button></div>`;
  } else {
    promptHTML = html`<div class="quiz-kn" style="font-size:1.3rem;color:var(--mud);line-height:1.4">"${q.promptEnglish}"</div>`;
    hearHTML = q.promptHint ? html`<div style="margin-bottom:14px;font-size:.8rem;color:var(--text-light);font-style:italic">💡 ${q.promptHint}</div>` : trusted('<div style="margin-bottom:14px"></div>');
  }

  const qId = 'q' + revIdx;
  const isAnswered = entry.answered;

  // Build option buttons — show transliteration below Kannada options in reversed mode
  const optButtons = q.options.map(opt => {
    const isCorrect = opt.value === q.correct;
    const isChosen = isAnswered && opt.value === entry.chosen;
    let cls = 'quiz-opt';
    if (isAnswered) {
      cls += isCorrect ? ' correct' : (isChosen ? ' wrong' : '');
    }
    const disabled = isAnswered ? 'disabled' : '';
    const label = opt.roman
      ? html`<span style="font-size:1rem;display:block">${opt.display}</span><span style="font-size:.72rem;font-style:italic;color:var(--mud-light);font-weight:400">${opt.roman}</span>`
      : opt.display;
    return html`<button class="quiz-opt ${cls}" data-val="${opt.value}" onclick="checkAnswer(this,'${qId}')" ${trusted(disabled)}>${label}</button>`;
  });

  // Result message if already answered
  let resultHTML = '';
  if (isAnswered) {
    const correct = entry.chosen === q.correct;
    resultHTML = html`<div class="quiz-result show ${correct?'correct':'wrong'}">${correct ? '✓ Correct! Well done!' : '✗ Not quite — the correct answer is highlighted in green above'}</div>`;
  }

  document.getElementById('revision-area').innerHTML = html`
    <div class="quiz-card" id="${qId}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span class="fc-counter" style="font-size:.68rem">Question ${revIdx+1} of ${total}</span>
        <span style="font-size:.7rem;font-weight:700;color:${q.reversed?'var(--leaf)':'var(--terracotta)'};background:${q.reversed?'rgba(107,142,78,.1)':'rgba(193,81,58,.08)'};padding:3px 9px;border-radius:12px">
          ${q.type==='word'?'🌟 Word':'💬 Sentence'}${q.reversed?' · 🔄 Reversed':''}
        </span>
      </div>
      <div class="quiz-q">${q.question}</div>
      ${promptHTML}
      ${hearHTML}
      <div class="quiz-options" id="qopts-${qId}">${optButtons}</div>
      ${resultHTML}

      <!-- Navigation arrows — always visible -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;gap:10px;">
        <button class="nav-arrow" ${trusted(prevDisabled)} onclick="quizPrev()" title="Previous question">←</button>
        <div style="display:flex;gap:5px;align-items:center;">
          ${Array.from({length:Math.min(total,10)}, (_,i) => {
            const dotIdx = total <= 10 ? i : Math.round(i*(total-1)/9);
            const isCur = total <= 10 ? i === revIdx : (revIdx >= Math.round(i*(total-1)/9) && (i===9 || revIdx < Math.round((i+1)*(total-1)/9)));
            const isDone = quizQuestions[dotIdx]?.answered;
            const bg = isCur ? 'var(--saffron)' : isDone ? 'var(--leaf)' : 'var(--sand-dark)';
            return html`<div style="width:8px;height:8px;border-radius:50%;background:${bg};transition:background .2s;"></div>`;
          })}
        </div>
        <button class="nav-arrow" onclick="quizNext()" title="Next question">${revIdx===total-1?'✓':'→'}</button>
      </div>
    </div>`;

  document.getElementById(qId).__correct = q.correct;
}

export function retrySameQuiz() { revIdx = 0; quizScore = 0; quizTotal = 0; renderQuizQuestion(); }

export function quizNext() {
  revIdx++;
  if (revIdx >= quizQuestions.length) showQuiz();
  else renderQuizQuestion();
}

export function quizPrev() {
  if (revIdx > 0) { revIdx--; renderQuizQuestion(); }
}

export function checkAnswer(clickedBtn, qId) {
  const container = document.getElementById(qId);
  if (!container || container.__answered) return;
  container.__answered = true;

  const correct = container.__correct;
  const chosen = clickedBtn.getAttribute('data-val');

  // Save on the quizQuestions entry so navigating back re-renders correctly
  if (quizQuestions[revIdx]) {
    quizQuestions[revIdx].answered = true;
    quizQuestions[revIdx].chosen = chosen;
    if (chosen === correct) quizScore++;
    quizTotal++;
  }

  // Re-render with answered state (avoids manipulating DOM manually)
  renderQuizQuestion();
}
