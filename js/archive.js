// Past lessons, grouped by week, plus the practiced-words list and the detail
// modal they both open.
import { html, attrJson } from './escape.js';
import { state, TOPICS, TOPIC_TAGS, getPracticedWords } from './state.js';
import { roleplayBubbles } from './lesson.js';
import { resolve } from './escape.js';

// ══════════════════════════════════════════════════════════════
//  ARCHIVE
// ══════════════════════════════════════════════════════════════
export function updateArchiveUI() {
  const c = document.getElementById('archive-content');
  if (!state.archive.length) { c.innerHTML='<p style="color:var(--text-light);font-size:.86rem;">Complete your first full lesson to start your archive.</p>'; return; }
  const weeks = {};
  state.archive.filter(e => e && e.lesson && e.lesson.word).forEach(e => { const k='Week '+e.week; if(!weeks[k]) weeks[k]=[]; weeks[k].push(e); });
  const out = Object.entries(weeks).reverse().map(([wl,entries]) => html`
    <div class="week-hdr">📅 ${wl} <span style="font-size:.68rem;font-weight:400;color:var(--text-light)">(${entries.length} lesson${entries.length>1?'s':''})</span></div>
    <div class="archive-grid">${entries.map(entry=>{
      const w=entry.lesson.word, ti=TOPICS.indexOf(entry.lesson.topic), tc=TOPIC_TAGS[Math.max(ti,0)];
      const idx=state.archive.indexOf(entry);
      return html`<div class="archive-card" onclick="openDetail(${idx})"><div class="arc-date">Day ${entry.day} · ${entry.date}</div><div class="arc-word">${w.kannada}</div><div class="arc-meaning">${w.meaning}</div><span class="topic-tag tag-${tc}">${entry.lesson.topic}</span></div>`;
    })}</div>`);
  c.innerHTML = resolve(out);
}

export function openDetail(idx) {
  const entry = state.archive[idx];
  if(!entry || !entry.lesson || !entry.lesson.word) return;
  const {word:w, sentence:s, roleplay:r} = entry.lesson;
  const wld=attrJson({kannada:w.kannada,transliteration:w.transliteration});
  const sld=attrJson({kannada:s.kannada,transliteration:s.transliteration});
  document.getElementById('modal-body').innerHTML=html`
    <h2 style="font-family:'Playfair Display',serif;color:var(--mud);margin-bottom:3px">Day ${entry.day}</h2>
    <p style="color:var(--text-light);font-size:.76rem;margin-bottom:14px">${entry.date} · ${entry.lesson.topic}</p>
    <div class="divider"></div>
    <div style="margin-bottom:14px">
      <div style="font-size:.65rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-light);margin-bottom:7px">🌟 Word</div>
      <div class="word-big" style="font-size:2.2rem">${w.kannada}</div>
      <div class="word-roman">${w.transliteration}</div>
      <div class="word-eng"><strong>${w.meaning}</strong> · ${w.partOfSpeech}</div>
      <button class="speak-btn" style="margin-top:9px;font-size:.74rem;padding:7px 12px" onclick='speak(${wld},this)'>🔊 Hear</button>
    </div>
    <div class="divider"></div>
    <div style="margin-bottom:14px">
      <div style="font-size:.65rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-light);margin-bottom:7px">💬 Sentence</div>
      <div class="sent-block"><div class="sent-kn">${s.kannada}</div><div class="sent-roman">${s.transliteration}</div><div class="sent-eng">${s.meaning}</div></div>
      ${s.breakdown ? html`<div class="tip-box" style="margin-top:9px">🔍 <strong>Breakdown:</strong> ${s.breakdown}</div>` : ''}
      ${s.breakdownHindi ? html`<div class="tip-box" style="margin-top:9px">🔍 <strong>विवरण (Hindi):</strong> ${s.breakdownHindi}</div>` : ''}
      <button class="speak-btn" style="margin-top:9px;font-size:.74rem;padding:7px 12px" onclick='speak(${sld},this)'>🔊 Hear</button>
    </div>
    <div class="divider"></div>
    <div>
      <div style="font-size:.65rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-light);margin-bottom:10px">🎭 Role Play · ${r.scenario}</div>
      ${roleplayBubbles(r)}
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
}

export function showWordsList() {
  const words = getPracticedWords();

  const body = html`
    <h2 style="font-family:'Playfair Display',serif;color:var(--mud);margin-bottom:3px">📚 Practiced Words</h2>
    <p style="color:var(--text-light);font-size:.78rem;margin-bottom:14px">${words.length} unique word${words.length===1?'':'s'} learned</p>
    ${!words.length
      ? html`<p style="color:var(--text-light);font-size:.88rem;">Complete a full lesson to start building your word list.</p>`
      : html`<div style="display:flex;flex-direction:column;gap:10px;">${words.map(({w}) => {
          const wld = attrJson({kannada:w.kannada,transliteration:w.transliteration});
          return html`<div style="background:rgba(232,213,176,.22);border:1px solid rgba(201,180,138,.45);border-radius:13px;padding:12px 14px;display:flex;align-items:center;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div class="arc-word">${w.kannada}</div>
              <div class="word-roman" style="font-size:.92rem;margin:2px 0">${w.transliteration}</div>
              <div class="word-eng" style="font-size:.85rem"><strong>${w.meaning}</strong>${w.partOfSpeech ? html` · ${w.partOfSpeech}` : ''}</div>
            </div>
            <button class="speak-btn" style="font-size:.74rem;padding:7px 11px;flex-shrink:0" onclick='speak(${wld},this)'>🔊</button>
          </div>`;
        })}</div>`}`;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-overlay').classList.add('open');
}

export function closeModal(e){ if(!e||e.target===document.getElementById('modal-overlay')) document.getElementById('modal-overlay').classList.remove('open'); }
