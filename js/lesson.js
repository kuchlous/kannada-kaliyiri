// Building and rendering a lesson. Claude writes the Kannada, Google Translate
// supplies the English, the two are cross-checked (verify.js), and then Claude
// breaks the sentence down from Google's translation.
import { html } from './escape.js';
import { state, apiKey, setApiKey, saveState, TOPICS, TOPIC_TAGS, getPracticedWords, getWeekNum } from './state.js';
import { showApiGate } from './gates.js';
import { showToast, goStep, setFocusMode, updateStepIndicator, enterCompletionMode } from './ui.js';
import { store } from './store.js';
import { verifyLesson } from './verify.js';

// ══════════════════════════════════════════════════════════════
//  FETCH LESSON
// ══════════════════════════════════════════════════════════════
export async function fetchLesson() {
  // Use the currently selected theme if set, otherwise rotate through topics by day
  const sel = document.getElementById('theme-select');
  const selVal = sel ? sel.value : 'random';
  const topic = (selVal && selVal !== 'random') ? selVal : TOPICS[(state.day-1) % TOPICS.length];
  return fetchLessonWithTopic(topic);
}

// ══════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════
export function renderAll(l) { renderWord(l); renderSentence(l); renderRoleplay(l); }

export function renderWord(l) {
  const w = l.word;
  const ti = TOPICS.indexOf(l.topic), tc = TOPIC_TAGS[Math.max(ti,0)];
  document.getElementById('word-topic').innerHTML = html`<span class="topic-tag tag-${tc}">${l.topic}</span>`;
  document.getElementById('word-body').innerHTML = html`
    ${l.unverified ? html`<div class="error-state">⚠️ <strong>Unverified.</strong> Google's
      translation of this Kannada disagrees with what it was meant to say
      (${l.unverified}). Treat it with caution — it will not be saved to your
      archive or revision deck.</div>` : ''}
    <div class="word-big">${w.kannada}</div>
    <div class="word-roman">${w.transliteration}</div>
    <div class="word-eng"><strong>${w.meaning}</strong> · ${w.partOfSpeech}</div>
    <div class="tip-box">💡 <strong>Tip:</strong> ${w.example}</div>`;
  document.getElementById('word-controls').style.display = 'block';
}

export function renderSentence(l) {
  const s = l.sentence;
  document.getElementById('sentence-body').innerHTML = html`
    <div class="sent-block">
      <div class="sent-kn">${s.kannada}</div>
      <div class="sent-roman">${s.transliteration}</div>
      <div class="sent-eng">${s.meaning}</div>
    </div>
    <div class="tip-box">🔍 <strong>Breakdown:</strong> ${s.breakdown}</div>
    ${s.breakdownHindi ? html`<div class="tip-box">🔍 <strong>विवरण (Hindi):</strong> ${s.breakdownHindi}</div>` : ''}`;
  document.getElementById('sentence-controls').style.display = 'block';
}

// Shared by the lesson's roleplay step and the archive detail modal.
export function roleplayBubbles(r) {
  return r.lines.map(line => {
    const iy = line.speaker === 'YOU';
    return html`<div class="chat-bubble ${iy?'you':''}">
      <div class="avatar ${iy?'you':'npc'}">${iy?'🧑':'🏪'}</div>
      <div class="bubble-inner">
        <div class="bubble-name">${iy?'You':r.npcName}</div>
        <div class="bubble-text ${iy?'you':'npc'}">
          <div class="bubble-kn">${line.kannada}</div>
          <div class="bubble-roman">${line.transliteration}</div>
          <div class="bubble-eng">${line.english}</div>
        </div>
      </div>
    </div>`;
  });
}

export function renderRoleplay(l) {
  const r = l.roleplay;
  document.getElementById('rp-scenario-title').textContent = '🎬 ' + r.scenario;
  document.getElementById('roleplay-body').innerHTML = html`
    <div class="rp-scene">Scenario · ${r.scenario}</div>
    ${roleplayBubbles(r)}`;
  document.getElementById('roleplay-controls').style.display = 'block';
}

// ══════════════════════════════════════════════════════════════
//  COMPLETION — the key mechanic
// ══════════════════════════════════════════════════════════════
export function completeStep(key, stepIdx) {
  if (state.done[key]) {
    // Already done — just navigate next
    if (stepIdx < 2) goStep(stepIdx + 1);
    return;
  }
  state.done[key] = true;
  saveState();
  markBtnDone('cbtn-'+key, key === 'roleplay' ? 'Role play done ✓' : key.charAt(0).toUpperCase()+key.slice(1)+' done ✓');
  updateStepIndicator();
  showToast(`✨ ${key.charAt(0).toUpperCase()+key.slice(1)} complete!`);

  // If all 3 done → archive, exit focus, show completion on main menu
  if (state.done.word && state.done.sentence && state.done.roleplay) {
    console.log('All 3 complete! Calling archiveToday...');
    archiveToday();
    setTimeout(() => {
      enterCompletionMode();
      showToast('🎉 Lesson complete! Well done!');
    }, 400);
  } else if (stepIdx < 2) {
    // Auto-advance
    setTimeout(() => goStep(stepIdx + 1), 500);
  }
}

function markBtnDone(id, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.className = 'complete-btn done';
  btn.textContent = '✓ ' + label;
}

export function repeatTodayLesson() {
  // Reset completion state but keep the same lesson data
  state.done = { word:false, sentence:false, roleplay:false };
  saveState();
  // Hide completion card, restore today panel, go straight into focus mode
  document.getElementById('lesson-complete-card').style.display = 'none';
  document.getElementById('panel-today').style.display = '';
  document.getElementById('step-indicator').style.display = '';
  setFocusMode(true);
  // Reset button states
  ['cbtn-word','cbtn-sentence','cbtn-roleplay'].forEach((id,i) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.className = 'complete-btn todo';
    btn.textContent = i < 2 ? '✓ Mark Complete & Continue →' : '✓ Mark Complete — Lesson Done! 🎉';
  });
  ['rec-panel-word','rec-panel-sentence','rec-panel-roleplay'].forEach(id =>
    document.getElementById(id).innerHTML = ''
  );
  goStep(0);
  // Re-render the existing lesson data
  if (state.todayData) renderAll(state.todayData);
}

export function archiveToday() {
  if (!state.todayData) return;
  // An unverified lesson must not enter the archive: the archive feeds the
  // revision deck, the quizzes and the never-repeat list, so anything wrong
  // that lands here is taught again indefinitely.
  if (state.todayData.unverified) {
    showToast('⚠️ Unverified lesson — not saved to your archive');
    return;
  }
  const sid = state.todayData.sessionId;
  // Archive EVERY completed session (daily lesson or dropdown-picked).
  // Dedupe only on the unique session id, so repeating the exact same loaded
  // lesson doesn't create a duplicate entry, but a new lesson always archives.
  if (sid && state.archive.find(a => a.sessionId === sid)) return;
  state.archive.push({
    sessionId: sid,
    day: state.day,
    date: new Date().toDateString(),
    week: getWeekNum(new Date()),
    lesson: JSON.parse(JSON.stringify(state.todayData)) // deep copy to avoid reference issues
  });
  saveState();
  console.log('Archived session', sid, '(day', state.day + ') — archive size:', state.archive.length);
}

export function loadNewDay() {
  // Hide completion card, stay clean — enter focus mode directly for new lesson
  document.getElementById('lesson-complete-card').style.display = 'none';
  document.getElementById('welcome-card').style.display = 'none';
  document.getElementById('step-indicator').style.display = '';
  document.getElementById('panel-today').style.display = '';
  setFocusMode(true);
  state.day++;
  if (state.day % 5 === 0 && state.level < 10) state.level++;
  state.done = {word:false,sentence:false,roleplay:false};
  state.todayData = null;
  document.getElementById('practice-area').innerHTML = '';
  // Reset UI
  ['word-body','sentence-body','roleplay-body'].forEach(id =>
    document.getElementById(id).innerHTML = `<div class="loading-state">Loading…<div class="loading-dots"><span></span><span></span><span></span></div></div>`
  );
  ['word-controls','sentence-controls','roleplay-controls'].forEach(id =>
    document.getElementById(id).style.display = 'none'
  );
  ['cbtn-word','cbtn-sentence','cbtn-roleplay'].forEach((id,i) => {
    const btn = document.getElementById(id);
    btn.className = 'complete-btn todo';
    btn.textContent = i < 2 ? '✓ Mark Complete & Continue →' : '✓ Mark Complete — Lesson Done! 🎉';
  });
  ['rec-panel-word','rec-panel-sentence','rec-panel-roleplay'].forEach(id =>
    document.getElementById(id).innerHTML = ''
  );
  saveState();
  goStep(0);
  fetchLesson();
  showToast('🌅 New day, new words!');
}

// ══════════════════════════════════════════════════════════════
//  THEME PICKER
// ══════════════════════════════════════════════════════════════
export function loadWithTheme() {
  const sel = document.getElementById('theme-select').value;
  const chosenTopic = sel === 'random' ? null : sel;

  // Preserve the current lesson only if it's complete — incomplete lessons are not
  // archived. archiveToday() dedupes on sessionId, so it won't create a duplicate.
  if (state.todayData && state.done.word && state.done.sentence && state.done.roleplay) archiveToday();

  // Hide welcome card, show lesson structure
  document.getElementById('welcome-card').style.display = 'none';
  document.getElementById('step-indicator').style.display = '';

  // Reset today's content (but keep archive intact)
  state.done = { word:false, sentence:false, roleplay:false };
  state.todayData = null;
  document.getElementById('practice-area').innerHTML = '';
  ['word-body','sentence-body','roleplay-body'].forEach(id =>
    document.getElementById(id).innerHTML = `<div class="loading-state">Loading…<div class="loading-dots"><span></span><span></span><span></span></div></div>`
  );
  ['word-controls','sentence-controls','roleplay-controls'].forEach(id =>
    document.getElementById(id).style.display = 'none'
  );
  ['cbtn-word','cbtn-sentence','cbtn-roleplay'].forEach((id,i) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.className = 'complete-btn todo';
    btn.textContent = i < 2 ? '✓ Mark Complete & Continue →' : '✓ Mark Complete — Lesson Done! 🎉';
  });
  ['rec-panel-word','rec-panel-sentence','rec-panel-roleplay'].forEach(id =>
    document.getElementById(id).innerHTML = ''
  );
  saveState();
  setFocusMode(true);
  goStep(0);
  fetchLessonWithTopic(chosenTopic);
  showToast(chosenTopic ? `📚 Loading lesson on: ${chosenTopic}` : '🎲 Loading a random lesson…');
}

// ── GOOGLE TRANSLATE ──
// One batched call for the whole lesson: the word, the sentence and every
// roleplay line. The key lives server-side in /api/translate — it is the
// operator's key and billable, unlike the per-user Anthropic key.
export async function translateLesson(lesson) {
  const lines = lesson.roleplay?.lines || [];
  const segments = [lesson.word.kannada, lesson.sentence.kannada, ...lines.map(l => l.kannada)];

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: segments, source: 'kn', target: 'en' })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Translation failed (${res.status})`);

  const [wordEn, sentenceEn, ...lineEns] = data.translations;
  lesson.word.meaning = wordEn;
  lesson.sentence.meaning = sentenceEn;
  lines.forEach((l, i) => { l.english = lineEns[i]; });
  return lesson;
}

// Claude explains the sentence, working from Google's translation rather than
// its own — so the breakdown always agrees with the English shown above it.
export async function addBreakdown(lesson) {
  const s = lesson.sentence;
  const prompt = `Kannada sentence: ${s.kannada}
Transliteration: ${s.transliteration}
English translation: ${s.meaning}

Explain that sentence word by word for a beginner. The explanation MUST agree with the English translation given above — do not substitute your own translation.
Return ONLY valid JSON (no markdown):
{"breakdown":"word by word breakdown in English","breakdownHindi":"word by word breakdown in Hindi (Devanagari script)"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body: JSON.stringify({model:'claude-sonnet-5',max_tokens:1024,messages:[{role:'user',content:prompt}]})
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `API error ${res.status}`);

  const out = data.content?.find(b => b.type === 'text')?.text || '';
  // The breakdown is a nicety — a lesson is still usable without it, so a
  // malformed reply here must not throw away a lesson that is otherwise fine.
  try {
    const parsed = JSON.parse(out.replace(/```json|```/g,'').trim());
    s.breakdown = parsed.breakdown;
    s.breakdownHindi = parsed.breakdownHindi;
  } catch(e) {}
  return lesson;
}

export async function fetchLessonWithTopic(forceTopic, attempt = 0) {
  // Re-read apiKey at call time in case it was just saved
  setApiKey(store.getItem('kk_apikey') || apiKey);
  if (!apiKey) {
    showApiGate();
    showToast('⚠️ Enter your API key to start');
    return;
  }
  const topic = forceTopic || TOPICS[Math.floor(Math.random() * TOPICS.length)];
  // Tell the model which words are already learned so it never repeats one (cap to bound prompt size).
  const learned = getPracticedWords().map(({w}) => `${w.kannada} (${w.meaning})`).slice(-100);
  const avoidClause = learned.length
    ? ` The learner has ALREADY learned these words, so the word of the day MUST be a brand-new word that is NOT in this list: ${learned.join('; ')}.`
    : '';
  // Claude writes the Kannada and the teaching material; it is NOT asked for any
  // English meanings. Those come from Google Translate below, so the English a
  // learner sees is a real translation of the Kannada rather than a second thing
  // the model generated alongside it.
  const prompt = `You are a Kannada teacher for an absolute beginner (level ${state.level}/10, day ${state.day}). Topic: "${topic}".${avoidClause}
Return ONLY valid JSON (no markdown):
{"topic":"${topic}","word":{"kannada":"script","transliteration":"syllable-hyphenated e.g. na-ma-ste","partOfSpeech":"noun/verb/etc","example":"fun practical tip in English","intent":"the English meaning you intend this Kannada to have"},"sentence":{"kannada":"simple sentence using the word","transliteration":"syllable-hyphenated","intent":"the English meaning you intend"},"roleplay":{"scenario":"Short scenario title e.g. At the market","npcName":"e.g. Shopkeeper","lines":[{"speaker":"NPC","kannada":"...","transliteration":"...","intent":"..."},{"speaker":"YOU","kannada":"...","transliteration":"...","intent":"..."},{"speaker":"NPC","kannada":"...","transliteration":"...","intent":"..."},{"speaker":"YOU","kannada":"...","transliteration":"...","intent":"..."}]}}
Rules: level 1-3 = very basic vocab. Everyday Bangalore Kannada. The word of the day must be NEW — never one of the already-learned words listed above. Roleplay must use today's word. Every "intent" is the English meaning you believe your Kannada carries. It is used to check your Kannada against an independent translation and is never shown to the learner, so state it plainly and accurately. ONLY JSON.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      // A full lesson is Kannada script + transliteration + a Devanagari
      // breakdown + four roleplay lines. Non-Latin scripts are token-expensive,
      // and at 1024 the JSON was truncating, which threw at the final parse and
      // failed the lesson. Output is billed as generated, so the higher cap is
      // headroom, not cost.
      body: JSON.stringify({model:'claude-sonnet-5',max_tokens:4096,stream:true,messages:[{role:'user',content:prompt}]})
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API error'); }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let wordDone = false, sentDone = false;

    const tryRenderWord = () => {
      if (wordDone) return;
      const m = text.match(/"word"\s*:\s*(\{[^{}]+\})/s);
      if (!m) return;
      try {
        const w = JSON.parse(m[1]);
        if (!state.todayData) state.todayData = {};
        state.todayData.word = w; // so speak('word') works immediately
        const ti = TOPICS.indexOf(topic), tc = TOPIC_TAGS[Math.max(ti,0)];
        document.getElementById('word-topic').innerHTML = html`<span class="topic-tag tag-${tc}">${topic}</span>`;
        document.getElementById('word-body').innerHTML = html`
          <div class="word-big">${w.kannada}</div>
          <div class="word-roman">${w.transliteration}</div>
          <div class="word-eng">${w.meaning ? html`<strong>${w.meaning}</strong> · ` : ''}${w.partOfSpeech}</div>
          ${w.example ? html`<div class="tip-box">💡 <strong>Tip:</strong> ${w.example}</div>` : ''}`;
        document.getElementById('word-controls').style.display = 'block';
        wordDone = true;
      } catch(e) {}
    };

    const tryRenderSentence = () => {
      if (sentDone || !wordDone) return;
      const m = text.match(/"sentence"\s*:\s*(\{[^{}]+\})/s);
      if (!m) return;
      try {
        const s = JSON.parse(m[1]);
        if (!state.todayData) state.todayData = {};
        state.todayData.sentence = s; // so speak('sentence') works immediately
        document.getElementById('sentence-body').innerHTML = html`
          <div class="sent-block">
            <div class="sent-kn">${s.kannada}</div>
            <div class="sent-roman">${s.transliteration}</div>
            ${s.meaning ? html`<div class="sent-eng">${s.meaning}</div>` : ''}
          </div>
          ${s.breakdown ? html`<div class="tip-box">🔍 <strong>Breakdown:</strong> ${s.breakdown}</div>` : ''}
          ${s.breakdownHindi ? html`<div class="tip-box">🔍 <strong>विवरण (Hindi):</strong> ${s.breakdownHindi}</div>` : ''}`;
        document.getElementById('sentence-controls').style.display = 'block';
        sentDone = true;
      } catch(e) {}
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, {stream:true}).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6);
        if (raw === '[DONE]') break;
        try {
          const ev = JSON.parse(raw);
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
            text += ev.delta.text;
            tryRenderWord();
            tryRenderSentence();
          }
          if (ev.type === 'error') throw new Error(ev.error?.message || 'Stream error');
        } catch(e) { if (e.message !== 'Unexpected end of JSON input') throw e; }
      }
    }

    const lesson = JSON.parse(text.replace(/```json|```/g,'').trim());
    await translateLesson(lesson);  // Google supplies every English meaning

    // Cross-check Claude's Kannada against Google's independent reading of it.
    // One retry, because a fresh sample usually fixes a one-off; a lesson that
    // fails twice is shown with a warning and refused entry to the archive
    // rather than being taught as if it were sound.
    const check = await verifyLesson(lesson);
    if (!check.ok) {
      if (attempt === 0) {
        showToast('⚠️ Translation check failed — regenerating…');
        return fetchLessonWithTopic(forceTopic, attempt + 1);
      }
      lesson.unverified = check.mismatches.map(m => m.what).join(', ');
    }

    await addBreakdown(lesson);     // Claude explains Google's translation
    lesson.sessionId = Date.now() + '-' + Math.floor(Math.random()*1e6);
    state.todayData = lesson;
    saveState();
    renderAll(lesson); // final authoritative render
  } catch(e) {
    ['word-body','sentence-body','roleplay-body'].forEach(id =>
      document.getElementById(id).innerHTML = html`<div class="error-state">⚠️ ${e.message}. Check your API key and refresh.</div>`
    );
  }
}
