// The app's persisted state, and the lesson-history helpers derived from it.
import { store } from './store.js';

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
export let apiKey = ''; // populated from server after auth in window.onload

// `apiKey` and `state` are reassigned, not just mutated. Only the declaring
// module may assign to an exported binding, so the setters below are how other
// modules replace them; importers see the new value through the live binding.
export function setApiKey(v) { apiKey = v || ''; }
export function setState(v) { state = v; }

// Load and sanitize state — strip any corrupt/incomplete archive entries from old versions
export function loadState() {
  try {
    const raw = store.getItem('kk_state');
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return null;
    // Ensure all required fields exist
    if (!parsed.done) parsed.done = { word:false, sentence:false, roleplay:false };
    if (!Array.isArray(parsed.archive)) parsed.archive = [];
    // Remove any archive entries missing lesson or lesson.word/sentence/roleplay
    parsed.archive = parsed.archive.filter(e =>
      e && e.lesson && e.lesson.word && e.lesson.sentence && e.lesson.roleplay &&
      e.lesson.word.kannada && e.lesson.sentence.kannada
    );
    return parsed;
  } catch(e) {
    console.warn('State parse error, resetting:', e);
    return null;
  }
}

export let state = loadState() || {
  day:1, streak:0, lastDate:null, level:1,
  done:{ word:false, sentence:false, roleplay:false },
  todayData:null, archive:[]
};

export const TOPICS = ['daily life & food','travel & directions','work & professional','family & relationships'];

export const TOPIC_TAGS = ['daily','travel','work','family'];

export function checkNewDay() {
  const today = new Date().toDateString();
  if (state.lastDate !== today) {
    if (state.lastDate) {
      const yest = new Date(); yest.setDate(yest.getDate()-1);
      state.streak = state.lastDate === yest.toDateString() ? state.streak+1 : 1;
    } else state.streak = 1;
    state.lastDate = today;
    state.done = { word:false, sentence:false, roleplay:false };
    state.todayData = null;
    saveState();
  }
}

// Called after every save. main.js points this at updateStats(); keeping it a
// hook is what stops state.js from importing ui.js, which imports state.js.
let afterSave = () => {};
export function setAfterSave(fn) { afterSave = fn; }

export function saveState() {
  store.setItem('kk_state', JSON.stringify(state));
  afterSave();
}

export function getWeekNum(d) {
  const j = new Date(d.getFullYear(),0,1);
  return Math.ceil((((d-j)/86400000)+j.getDay()+1)/7);
}

// Unique practiced words from completed (archived) lessons, deduped by Kannada text.
export function getPracticedWords() {
  const valid = state.archive.filter(e => e && e.lesson && e.lesson.word && e.lesson.word.kannada);
  const seen = new Set();
  const words = [];
  valid.forEach(e => {
    const w = e.lesson.word;
    if (!seen.has(w.kannada)) { seen.add(w.kannada); words.push({ w, day: e.day, topic: e.lesson.topic }); }
  });
  return words;
}
