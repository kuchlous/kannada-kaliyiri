// Chrome: focus mode, tab switching, the step indicator, toasts and stats.
import { state, getPracticedWords } from './state.js';

// ── FOCUS MODE — hide all chrome when learning ──
let focusActive = false;

export function setFocusMode(on) {
  focusActive = on;
  const chromeIds = ['chrome-ornament','chrome-h1','chrome-subtitle','chrome-ask-wrap',
                     'chrome-badge','chrome-stats','chrome-nav','chrome-reset','chrome-theme'];
  chromeIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', on);
  });
  // Show/hide the floating ← Menu button
  const menuBtn = document.getElementById('focus-menu-btn');
  if (menuBtn) menuBtn.classList.toggle('visible', on);
  if (on) {
    document.getElementById('ask-body')?.classList.remove('open');
    document.getElementById('ask-toggle-btn')?.classList.remove('open');
  }
}

// Reflect whether a lesson has already been completed today on the welcome button.
export function updateWelcomeBtn() {
  const btn = document.getElementById('welcome-start-btn');
  if (!btn) return;
  const todayStr = new Date().toDateString();
  const doneToday = state.archive.some(e => e && e.date === todayStr && e.lesson && e.lesson.word);
  btn.textContent = doneToday
    ? "✓ Today's lesson completed. Start another lesson"
    : "▶ Start Today's Lesson";
}

export const COMPLETION_HIDE = [
  'chrome-ornament','chrome-h1','chrome-subtitle','chrome-ask-wrap','chrome-badge',
  'chrome-stats','chrome-nav','chrome-reset',
  'panel-today','panel-revision','panel-archive'
];

export function enterCompletionMode() {
  COMPLETION_HIDE.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const card = document.getElementById('lesson-complete-card');
  card.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function updateStats() {
  document.getElementById('day-count').textContent = state.day;
  document.getElementById('streak-val').textContent = state.streak;
  document.getElementById('words-val').textContent = getPracticedWords().length;
  document.getElementById('level-val').textContent = state.level;
  updateRevStats();
}

let currentStep = 0;  // 0=word 1=sentence 2=roleplay

// ══════════════════════════════════════════════════════════════
//  STEP NAVIGATION
// ══════════════════════════════════════════════════════════════
export function goStep(n) {
  // Hide all step cards
  [0,1,2].forEach(i => document.getElementById('step-'+i).style.display = 'none');
  document.getElementById('step-'+n).style.display = 'block';
  currentStep = n;
  updateStepIndicator();
  document.getElementById('step-'+n).scrollIntoView({behavior:'smooth', block:'start'});
}

export function updateStepIndicator() {
  const keys = ['word','sentence','roleplay'];
  [0,1,2].forEach(i => {
    const dot = document.getElementById('sdot-'+i);
    dot.classList.remove('active','done');
    if (state.done[keys[i]]) dot.classList.add('done');
    else if (i === currentStep) dot.classList.add('active');
  });
  [0,1].forEach(i => {
    const line = document.getElementById('sline-'+i);
    line.classList.toggle('done', state.done[keys[i]]);
  });
}

export function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} }

let toastT;

export function showToast(msg){ const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3200); }

// ══════════════════════════════════════════════════════════════
//  REVISION
// ══════════════════════════════════════════════════════════════
export function updateRevStats() {
  const el = document.getElementById('rev-stats');
  if(!el) return;
  const valid = state.archive.filter(e => e && e.lesson && e.lesson.word && e.lesson.sentence);
  // Count unique cards by deduplicating on Kannada text
  const seen = new Set();
  let uniqueCards = 0;
  valid.forEach(e => {
    if (e.lesson.word.kannada && !seen.has(e.lesson.word.kannada)) { seen.add(e.lesson.word.kannada); uniqueCards++; }
    if (e.lesson.sentence.kannada && !seen.has(e.lesson.sentence.kannada)) { seen.add(e.lesson.sentence.kannada); uniqueCards++; }
  });
  el.textContent = uniqueCards > 0 ? `${uniqueCards} unique card${uniqueCards>1?'s':''} available` : 'Complete a full lesson to unlock revision';
}
