// Pronunciation: playback through the /api/tts proxy, and microphone capture so
// a learner can compare their own attempt.
import { state } from './state.js';
import { showToast } from './ui.js';

// ══════════════════════════════════════════════════════════════
//  AUDIO — Google Translate TTS via /api/tts proxy
// ══════════════════════════════════════════════════════════════
let speakingBtn = null;

let _ttsAudio = null;

export function speak(typeOrObj, btnEl) {
  let parts = [];
  if (typeOrObj === 'word') {
    parts = [state.todayData?.word?.kannada].filter(Boolean);
  } else if (typeOrObj === 'sentence') {
    parts = [state.todayData?.sentence?.kannada].filter(Boolean);
  } else if (typeOrObj === 'roleplay') {
    parts = (state.todayData?.roleplay?.lines || []).map(l => l.kannada).filter(Boolean);
  } else if (typeof typeOrObj === 'object') {
    parts = [typeOrObj.kannada].filter(Boolean);
  } else {
    parts = [typeOrObj].filter(Boolean);
  }

  if (!parts.length) return;

  if (_ttsAudio) { _ttsAudio.pause(); _ttsAudio = null; }
  if (speakingBtn) speakingBtn.classList.remove('speaking');
  speakingBtn = btnEl || null;
  if (btnEl) btnEl.classList.add('speaking');

  const done = () => {
    if (btnEl) btnEl.classList.remove('speaking');
    speakingBtn = null;
    _ttsAudio = null;
  };

  const playNext = (idx) => {
    if (idx >= parts.length) { done(); return; }
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(parts[idx])}`);
    _ttsAudio = audio;
    audio.onended = () => playNext(idx + 1);
    audio.onerror = () => { showToast('⚠️ Audio unavailable'); done(); };
    audio.play().catch(() => { showToast('⚠️ Audio blocked — tap to allow'); done(); });
  };

  playNext(0);
}

// ══════════════════════════════════════════════════════════════
//  RECORDING
// ══════════════════════════════════════════════════════════════
const recState = {};

export async function toggleRec(type) { if (recState[type]?.on) stopRec(type); else await startRec(type); }

async function startRec(type) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    const chunks = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t=>t.stop());
      const url = URL.createObjectURL(new Blob(chunks,{type:'audio/webm'}));
      document.getElementById(`rec-panel-${type}`).innerHTML = `
        <div class="rec-panel">
          <h4>🎙 Your Recording</h4>
          <audio class="playback" controls src="${url}"></audio>
          <div style="margin-top:9px;display:flex;gap:7px;flex-wrap:wrap">
            <button class="speak-btn" style="font-size:.75rem;padding:7px 12px" onclick="speak('${type}',this)">🔊 Hear correct pronunciation</button>
            <button class="btn-secondary btn" style="font-size:.75rem;padding:7px 12px" onclick="document.getElementById('rec-panel-${type}').innerHTML=''">🗑 Clear</button>
          </div>
        </div>`;
      showToast('✅ Recorded! Compare with correct pronunciation.');
    };
    mr.start();
    recState[type] = {on:true, mr, anim:null};
    document.getElementById(`rec-panel-${type}`).innerHTML = `
      <div class="rec-panel"><h4>🔴 Recording…</h4>
        <div class="rec-wave" id="wave-${type}">
          ${Array(16).fill(0).map(()=>`<div class="rec-bar" style="height:6px"></div>`).join('')}
        </div>
      </div>`;
    animWave(type);
    const btn = document.getElementById('rec-'+type);
    btn.classList.add('recording'); btn.textContent = '⏹ Stop';
    showToast('🔴 Recording — speak now!');
  } catch(e) { showToast('⚠️ Mic access denied — allow in browser settings.'); }
}

function stopRec(type) {
  const s = recState[type]; if(!s) return;
  if(s.anim) cancelAnimationFrame(s.anim);
  if(s.mr && s.mr.state!=='inactive') s.mr.stop();
  s.on = false;
  const btn = document.getElementById('rec-'+type);
  if(btn){btn.classList.remove('recording');btn.textContent='🎙 Record Me';}
}

function animWave(type) {
  const wf = document.getElementById('wave-'+type); if(!wf) return;
  const bars = wf.querySelectorAll('.rec-bar');
  const f = () => { if(!recState[type]?.on) return; bars.forEach(b=>b.style.height=(4+Math.random()*24)+'px'); recState[type].anim=requestAnimationFrame(f); };
  f();
}
