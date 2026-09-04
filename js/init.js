// First render after sign-in: lands the user on the main menu with no lesson
// loaded. Separate from main.js so auth.js can call it without a cycle.
import { store } from './store.js';
import { state, apiKey, setApiKey, checkNewDay } from './state.js';
import { showApiGate, hideApiGate } from './gates.js';
import { setFocusMode, updateStats, updateWelcomeBtn, updateRevStats, showToast } from './ui.js';
import { updateArchiveUI } from './archive.js';

// A failed read used to be indistinguishable from a new account: state fell back
// to the defaults and the next save replaced the server's copy with them. Writes
// are now blocked instead, so say so rather than looking like progress was lost.
export function warnNotHydrated() {
  showToast('⚠️ Could not load your saved progress. Nothing will be saved — reload to retry.');
}

// Initialise the app
// Lands on the main menu (chrome visible, no focus mode, no lesson loaded)
export function initApp() {
  // Re-read apiKey in case it was saved in a previous session
  setApiKey(store.getItem('kk_apikey'));
  updateStats();
  if (apiKey) {
    hideApiGate();
    checkNewDay();
  } else {
    showApiGate();
  }
  setFocusMode(false);
  updateArchiveUI();
  updateRevStats();
  // Show welcome card on main menu — hide lesson steps
  [0,1,2].forEach(i => document.getElementById('step-'+i).style.display = 'none');
  document.getElementById('step-indicator').style.display = 'none';
  document.getElementById('welcome-card').style.display = 'block';
  updateWelcomeBtn();
  // Only now is the page showing the right thing — reveal it. Every path that
  // makes the app usable ends here, including saveApiKey().
  document.querySelector('.app-wrapper')?.classList.remove('booting');
}

export function resetApp() {
  if (!confirm('This will clear ALL saved data (lessons, archive, API key). Are you sure?')) return;
  store.clear();
  location.reload();
}
