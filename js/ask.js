// The header "Ask" panel — a free-text Kannada question answered by Claude.
// Deliberately still Claude rather than Google Translate: it answers questions
// about usage, not just word-for-word translation.
import { html, trusted, esc } from './escape.js';
import { apiKey } from './state.js';
import { showApiGate } from './gates.js';
import { showToast } from './ui.js';

// ══════════════════════════════════════════════════════════════
//  ASK A QUESTION
// ══════════════════════════════════════════════════════════════
export function toggleAskPanel() {
  const btn = document.getElementById('ask-toggle-btn');
  const body = document.getElementById('ask-body');
  const isOpen = body.classList.contains('open');
  const opening = !isOpen;
  body.classList.toggle('open', opening);
  btn.classList.toggle('open', opening);
  setMainContentVisible(!opening);
}

function setMainContentVisible(visible) {
  // Hide/show everything except the ask panel and header title
  const els = ['chrome-stats', 'panel-today', 'panel-revision', 'panel-archive',
               'chrome-nav', 'chrome-reset', 'chrome-badge'];
  els.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.visibility = visible ? '' : 'hidden';
  });
}

// Close ask panel when clicking outside it
document.addEventListener('click', function(e) {
  const panel = document.querySelector('.ask-panel');
  const body = document.getElementById('ask-body');
  if (panel && !panel.contains(e.target) && body?.classList.contains('open')) {
    body.classList.remove('open');
    document.getElementById('ask-toggle-btn')?.classList.remove('open');
    setMainContentVisible(true);
  }
});

export async function submitAsk() {
  const input = document.getElementById('ask-input');
  const q = input.value.trim();
  if (!q) return;
  if (!apiKey) { showApiGate(); showToast('⚠️ Please enter your API key first'); return; }

  const btn = document.getElementById('ask-submit-btn');
  btn.disabled = true;
  btn.textContent = '…';

  const area = document.getElementById('ask-answer-area');
  area.innerHTML = `<div class="ask-loading"><div class="loading-dots"><span></span><span></span><span></span></div> Thinking…</div>`;

  const prompt = `You are a Kannada language teacher. Answer the student's question directly and crisply. No greetings, no praise, no filler phrases like "good question" or "certainly".

Rules:
- Always use the respectful/formal form (ನೀವು / -ರಿ ending) as the primary answer
- Only add a brief "Note:" if there is a meaningfully different informal version (ನೀನು / -u ending) — skip the note if the difference is trivial
- Format: [KN: Kannada script] [ROM: syllable-hyphenated transliteration] [ENG: English meaning]
- If the question asks how to say something, give the full phrase
- Max 60 words total
- Use everyday Bangalore Kannada

Student's question: "${q}"`;


  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body: JSON.stringify({model:'claude-sonnet-5',max_tokens:300,messages:[{role:'user',content:prompt}]})
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `API error ${res.status}`);
    const answer = data.content?.find(b => b.type === 'text')?.text;
    if (!answer) throw new Error('No text in response');

    // Escape first, then expand the KN/ROM/ENG markers into the only markup we
    // intend to emit. The marker syntax survives escaping. `trusted` because the
    // escaping is already done — passing the string plain would double-escape it.
    const formatted = trusted(esc(answer)
      .replace(/\[KN:\s*(.*?)\]/g, '<span class="kn">$1</span>')
      .replace(/\[ROM:\s*(.*?)\]/g, '<span class="rom">$1</span>')
      .replace(/\[ENG:\s*(.*?)\]/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>'));

    area.innerHTML = html`
      <div class="ask-answer">
        <div class="ask-answer-head">💡 Answer</div>
        <div class="ask-answer-body">${formatted}</div>
      </div>`;
  } catch(e) {
    area.innerHTML = html`<div class="error-state">⚠️ ${e.message}</div>`;
  }

  btn.disabled = false;
  btn.textContent = 'Ask →';
}
