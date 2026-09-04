// Moving between the three panels, and back to the main menu. Separate from
// ui.js so that ui.js stays a leaf: this is the one place that reaches into
// both the archive and revision panels, which would otherwise make ui.js and
// those modules import each other.
import { COMPLETION_HIDE, setFocusMode, updateWelcomeBtn, updateRevStats } from './ui.js';
import { updateArchiveUI } from './archive.js';

export function goToMainMenu() {
  // Clear completion-mode hiding — enterCompletionMode() sets inline display:none
  // on the header, stats, nav, reset and panels; setFocusMode(false) only clears
  // the CSS class, not these inline styles, so restore them here.
  COMPLETION_HIDE.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  // Exit focus mode — show all chrome
  setFocusMode(false);
  // Make the Today panel the active one (so this works from Revise/Archive too)
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-today').classList.add('active');
  const firstTab = document.querySelector('.nav-tab');
  if (firstTab) firstTab.classList.add('active');
  // Hide lesson cards, step indicator, and completion card
  [0,1,2].forEach(i => document.getElementById('step-'+i).style.display = 'none');
  document.getElementById('step-indicator').style.display = 'none';
  document.getElementById('lesson-complete-card').style.display = 'none';
  // Restore the Today panel and show the welcome (home) card
  document.getElementById('panel-today').style.display = '';
  document.getElementById('welcome-card').style.display = 'block';
  updateWelcomeBtn();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
export function goToMenuFromRevision() {
  setFocusMode(false);
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-today').style.display = '';
  document.getElementById('panel-today').classList.add('active');
  document.querySelector('.nav-tab').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// ══════════════════════════════════════════════════════════════
//  TABS / UTILS
// ══════════════════════════════════════════════════════════════
export function switchTab(tab,el){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('panel-'+tab).classList.add('active');
  el.classList.add('active');
  if(tab==='archive') updateArchiveUI();
  if(tab==='revision') updateRevStats();
  // Focus mode on Today and Revision, full chrome on Archive
  setFocusMode(tab === 'today' || tab === 'revision');
  // Hide floating menu btn on revision (no lesson cards there)
  document.getElementById('focus-menu-btn').classList.toggle('visible', tab === 'today');
}
