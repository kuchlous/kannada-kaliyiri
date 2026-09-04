// HTML escaping. Lesson content is model- and Google-supplied free text that is
// rendered with innerHTML, then archived and re-rendered indefinitely, so
// escaping happens here at the HTML boundary — never where the data is parsed.
// Tag a template with `html` and every ${...} in it is escaped by default.

// ══════════════════════════════════════════════════════════════
//  ESCAPING
// ══════════════════════════════════════════════════════════════
// Lesson content comes back from the model as free text and is rendered with
// innerHTML, then archived and re-rendered forever.
//
// Escaping happens here, at the HTML boundary — NOT where the lesson is parsed.
// The same strings are also fed to /api/tts, spliced into the next lesson prompt,
// and compared against quiz answers; escaping them on the way in would store
// "What&#39;s your name?" in KV forever, mixed in with the raw entries users
// already have. Tag a template with `html` and every ${...} in it is escaped by
// default, so the safe thing is what you get for free.
const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ESC_MAP[c]);
}

// Marks a value as already-safe markup so `html` passes it through untouched.
// Named `trusted` rather than `raw` because `raw` is already a local variable
// name in three unrelated functions here, and the shadowing would be silent.
// toString lets a Raw be assigned straight to .innerHTML / passed to
// insertAdjacentHTML — both stringify their argument.
export class Raw {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export function trusted(value) { return new Raw(value); }

export function resolve(v) {
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(resolve).join(''); // no .join('') at call sites
  return esc(v);
}

// Tagged template: html`<div>${untrusted}</div>`. Returns Raw, so nesting an
// html`` inside another html`` composes without double-escaping.
export function html(strings, ...vals) {
  return trusted(strings.reduce((out, s, i) => out + s + (i < vals.length ? resolve(vals[i]) : ''), ''));
}

// For values passed to an inline handler in a single-quoted attribute, e.g.
// onclick='speak(${attrJson(obj)},this)'. Escaping & first (esc does, via one
// pass over the char class) keeps any literal entity in the data intact, and
// escaping ' stops the JSON from closing the attribute early. Returns Raw
// because the escaping is already done.
export function attrJson(obj) { return trusted(esc(JSON.stringify(obj))); }
