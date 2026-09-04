// Server-backed key/value store. An in-memory cache is filled from /api/state at
// startup; writes are debounced and pushed back, so progress survives browser
// storage eviction and follows the user across devices.

// ── SERVER-BACKED STORE ──
// In-memory cache populated from /api/state at startup. Writes are debounced
// and pushed to the server, so they survive any browser storage eviction.
const _mem = {};

let _saveTimer = null;

// PUT /api/state does a whole-object kv.set — it replaces, it does not merge.
// So a write issued before we have successfully read the server's copy would
// overwrite real progress with the empty defaults. Every write is gated on this
// flag; it is set only by a hydrate that actually returned data.
let _hydrated = false;

export async function pushState() {
  if (!_hydrated) return;
  try {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_mem)
    });
  } catch(e) {}
}

export function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(pushState, 800);
}

// Writes are debounced by 800ms, so closing or reloading the tab right after
// finishing a lesson would drop that write. Flush synchronously on the way out.
// keepalive lets the request outlive the page; it caps the body at 64KB, which
// is far more than this state reaches in normal use, and the debounced write is
// still the primary path.
export function flushState() {
  if (!_hydrated) return;
  clearTimeout(_saveTimer);
  try {
    fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_mem),
      keepalive: true
    });
  } catch(e) {}
}

window.addEventListener('pagehide', flushState);

// pagehide is unreliable on mobile Safari; visibilitychange is the backstop.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushState(); });

// Returns true only if the server's state was actually read. A brand-new user
// gets {} with a 200, which counts as hydrated — there is simply nothing yet.
export async function hydrateStore() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return false;
    Object.assign(_mem, await res.json());
    _hydrated = true;
    return true;
  } catch(e) { return false; }
}

export const store = {
  getItem(k)   { return _mem[k] ?? null; },
  setItem(k, v){ _mem[k] = String(v); scheduleSave(); },
  removeItem(k){ delete _mem[k]; scheduleSave(); },
  clear()      { Object.keys(_mem).forEach(k => delete _mem[k]); scheduleSave(); }
};
