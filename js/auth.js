// Email/password sign-in and the Anthropic API key prompt that follows it.
import { store, hydrateStore } from './store.js';
import { setState, apiKey, setApiKey, loadState, checkNewDay } from './state.js';
import { showApiGate, hideApiGate, hideAuthGate } from './gates.js';
import { showToast } from './ui.js';
import { initApp, warnNotHydrated } from './init.js';

// ── AUTH ──
let authMode = 'login';

export function toggleAuthMode() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  const isLogin = authMode === 'login';
  document.getElementById('auth-title').textContent = isLogin ? '🔐 Sign In' : '✨ Create Account';
  document.getElementById('auth-desc').textContent = isLogin ? 'Welcome back!' : 'Join to save your progress across all devices.';
  document.getElementById('auth-submit-btn').textContent = isLogin ? 'Sign In →' : 'Create Account →';
  document.getElementById('auth-toggle').textContent = isLogin ? 'New here? Create an account' : 'Already have an account? Sign in';
  document.getElementById('auth-error').style.display = 'none';
}

export async function submitAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Please enter email and password'; errEl.style.display = 'block'; return; }
  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true; btn.textContent = '…';
  try {
    const res = await fetch(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Something went wrong';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = authMode === 'login' ? 'Sign In →' : 'Create Account →';
      return;
    }
    hideAuthGate();
    if (!await hydrateStore()) warnNotHydrated();
    setApiKey(store.getItem('kk_apikey'));
    const reloaded = loadState();
    if (reloaded) setState(reloaded);
    if (!apiKey) { showApiGate(); } else { initApp(); }
  } catch(e) {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Sign In →' : 'Create Account →';
  }
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
}

export function saveApiKey() {
  const v = document.getElementById('api-key-input').value.trim();
  if (!v.startsWith('sk-ant')) { showToast('⚠️ Enter a valid Anthropic key'); return; }
  setApiKey(v);
  store.setItem('kk_apikey', apiKey);
  showToast('✓ API key saved!');
  // initApp() hides the gate and runs checkNewDay() itself, and — crucially —
  // renders the main menu. Calling only hideApiGate() here left a first-time
  // user looking at the static #step-0 placeholder ("Generating your word…"),
  // which reads as a lesson stuck loading when nothing was ever requested.
  initApp();
}
