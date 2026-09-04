// Turn-by-turn roleplay practice: the learner takes one side of the scripted
// conversation and records their lines.
import { html } from './escape.js';
import { state } from './state.js';
import { speak } from './audio.js';
import { showToast } from './ui.js';
import { attrJson } from './escape.js';

// ══════════════════════════════════════════════════════════════
//  PRACTICE MODE
// ══════════════════════════════════════════════════════════════
let pRole=null, pLines=[], pNpc='', pStep=0;

export function openPractice() {
  if(!state.todayData) return;
  const r = state.todayData.roleplay;
  pLines=r.lines; pNpc=r.npcName; pRole=null;
  document.getElementById('practice-area').innerHTML=html`
    <div class="practice-intro">
      <h4>🎮 Practice: ${r.scenario}</h4>
      <p>Pick your role — the AI speaks the other character's lines aloud. Record yours!</p>
      <div class="role-choice">
        <button class="role-btn" onclick="pickRole('YOU',this)"><span class="role-icon">🧑</span><strong>Play Yourself</strong><br><span style="font-size:.72rem;color:var(--text-light)">AI plays ${r.npcName}</span></button>
        <button class="role-btn" onclick="pickRole('NPC',this)"><span class="role-icon">🏪</span><strong>Play ${r.npcName}</strong><br><span style="font-size:.72rem;color:var(--text-light)">AI plays You</span></button>
      </div>
      <button class="btn btn-leaf" id="start-prac-btn" onclick="startPrac()" style="display:none">▶ Start Conversation</button>
    </div>
    <div class="prac-chat" id="prac-chat"></div>`;
  document.getElementById('practice-area').scrollIntoView({behavior:'smooth',block:'nearest'});
}

export function pickRole(role,btn) {
  pRole=role;
  document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('start-prac-btn').style.display='inline-flex';
}

export function startPrac() { pStep=0; document.getElementById('prac-chat').innerHTML=''; nextPrac(); }

function nextPrac() {
  if(pStep>=pLines.length){
    document.getElementById('prac-chat').insertAdjacentHTML('beforeend',`
      <div class="prac-done"><div style="font-size:2.4rem;margin-bottom:6px">🌟</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--mud);margin-bottom:5px">ಶಾಭಾಸ್! Well done!</div>
        <p style="color:var(--text-light);font-size:.83rem;margin-bottom:12px">Conversation complete!</p>
        <button class="btn btn-primary" onclick="startPrac()">🔄 Again</button></div>`);
    return;
  }
  const line = pLines[pStep];
  const aiTurn = line.speaker !== pRole;
  const chat = document.getElementById('prac-chat');
  if(aiTurn){
    const div = document.createElement('div');
    div.className='prac-turn ai-turn';
    const ld = attrJson({kannada:line.kannada,transliteration:line.transliteration});
    div.innerHTML=html`<div class="turn-lbl ai">${line.speaker==='NPC'?pNpc:'You'} (AI 🔊)</div>
      <div class="bubble-kn" style="margin-bottom:3px">${line.kannada}</div>
      <div class="bubble-roman">${line.transliteration}</div>
      <div class="bubble-eng" style="margin-top:2px">${line.english}</div>
      <button class="speak-btn" style="margin-top:8px;font-size:.72rem;padding:6px 11px" onclick='speak(${ld},this)'>🔊 Replay</button>`;
    chat.appendChild(div); chat.scrollTop=chat.scrollHeight;
    setTimeout(()=>speak({kannada:line.kannada,transliteration:line.transliteration},null),350);
    pStep++;
    setTimeout(nextPrac, Math.max(2600,line.kannada.length*140));
  } else {
    const s=pStep;
    const div=document.createElement('div');
    div.id='pt-'+s; div.className='prac-turn your-turn active';
    div.innerHTML=html`<div class="turn-lbl you">Your turn 🎤</div>
      <div style="font-weight:700;font-size:.86rem;color:var(--mud);margin-bottom:4px">Say in Kannada:</div>
      <div class="cue-eng">"${line.english}"</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="rec-btn" id="pr-${s}" onclick="togglePR(${s})">🎙 Record My Line</button>
      </div>
      <button class="hint-btn" onclick="document.getElementById('ph-${s}').classList.toggle('show')">💡 Show Kannada hint</button>
      <div class="hint-box" id="ph-${s}"><strong>ಕನ್ನಡ:</strong> ${line.kannada}<br><em>${line.transliteration}</em></div>
      <div id="pa-${s}"></div>
      <button class="btn btn-leaf" style="margin-top:11px;font-size:.79rem;padding:8px 15px" onclick="okStep(${s})">✓ Done — Next →</button>`;
    chat.appendChild(div); chat.scrollTop=chat.scrollHeight;
  }
}

const pr={};

export async function togglePR(s){
  if(pr[s]?.on){if(pr[s].mr&&pr[s].mr.state!=='inactive')pr[s].mr.stop();pr[s].on=false;const b=document.getElementById('pr-'+s);if(b){b.classList.remove('recording');b.textContent='🎙 Again';}return;}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[];const mr=new MediaRecorder(stream);
    mr.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
    mr.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const url=URL.createObjectURL(new Blob(chunks,{type:'audio/webm'}));const el=document.getElementById('pa-'+s);if(el)el.innerHTML=`<audio class="playback" controls src="${url}" style="margin-top:7px"></audio>`;showToast('✅ Recorded!');};
    mr.start();pr[s]={on:true,mr};const b=document.getElementById('pr-'+s);if(b){b.classList.add('recording');b.textContent='⏹ Stop';}showToast('🔴 Recording…');
  }catch(e){showToast('⚠️ Mic denied.');}
}

export function okStep(s){if(pr[s]?.on&&pr[s].mr&&pr[s].mr.state!=='inactive')pr[s].mr.stop();const el=document.getElementById('pt-'+s);if(el)el.classList.remove('active');pStep++;setTimeout(nextPrac,260);}
