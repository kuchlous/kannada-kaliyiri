// Round-trip verification.
//
// Claude writes the Kannada and separately declares the English it intended.
// Google independently translates that Kannada back to English. If the two
// disagree, the Kannada does not mean what it claims — which is the failure
// worth catching, because a beginner cannot catch it themselves.
//
// The declared intent is used ONLY for this comparison and is never rendered:
// the English a learner sees is always Google's.
//
// Two systems, uncorrelated failure modes. It does not catch Kannada that is
// correct but too formal, and both can still be wrong the same way on a rare
// word — this turns a blind trust into a checked claim, not a guarantee.

import { apiKey } from './state.js';

// ── The Hindi channel ──
// Kannada marks the level of address (ನೀನು / ನೀವು) and so does Hindi
// (तू / तुम / आप); English does not. The English round-trip is therefore blind
// to a politeness error — "did you eat?" reads identically either way, so a line
// that is rude to a shopkeeper passes. Google's Kannada→Hindi rendering is not
// blind to it, so comparing it against the Hindi Claude says it meant catches
// the one class of mistake the English check structurally cannot see.
//
// ponytail: pronouns only. Hindi is pro-drop, so a line with no pronoun scores
// null and is skipped rather than guessed at from verb endings, which are
// ambiguous (हो is both the तुम present and a subjunctive). Add ending detection
// if too many lines come back unknown.
const REGISTER = {
  formal:   ['आप','आपको','आपका','आपकी','आपके','आपसे','आपने'],
  familiar: ['तुम','तुम्हें','तुमको','तुम्हारा','तुम्हारी','तुम्हारे','तुमसे','तुमने'],
  informal: ['तू','तुझे','तुझको','तेरा','तेरी','तेरे','तुझसे','तूने'],
};

// 'formal' | 'familiar' | 'informal' | null (no second-person pronoun present).
export function hindiRegister(s) {
  const words = new Set(String(s ?? '').split(/[^ऀ-ॿ]+/).filter(Boolean));
  for (const level of Object.keys(REGISTER))
    if (REGISTER[level].some(m => words.has(m))) return level;
  return null;
}

const STOP = new Set(['a','an','the','is','am','are','was','were','i','you','he','she','it','we','they',
  'to','of','in','on','at','for','with','my','your','his','her','their','do','does','did','have','has',
  'had','will','would','and','or','that','this','be','been','me','him','them','us','from','as','so']);

function contentWords(s) {
  return String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter(w => w && !STOP.has(w));
}

// Containment rather than Jaccard: "food" vs "I ate the food" should score high,
// and the two sides are often very different lengths.
export function similarity(a, b) {
  const A = new Set(contentWords(a)), B = new Set(contentWords(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach(w => { if (B.has(w)) shared++; });
  return shared / Math.min(A.size, B.size);
}

// Above this the two readings clearly agree and no model call is needed.
const CLEARLY_AGREE = 0.6;

// Ask Claude whether two English phrasings mean the same thing. This is not
// Claude checking its own Kannada — the semantic work was done by Google's
// independent translation; this only adjudicates whether two English strings
// agree, so that a synonym ("meal" vs "lunch") is not reported as an error.
async function judge(pairs) {
  const list = pairs.map((p, i) => `${i + 1}. A: "${p.claude}"   B: "${p.google}"`).join('\n');
  const prompt = `For each numbered pair, do A and B describe the same meaning? Synonyms, articles, tense and word-order differences all count as the SAME. Only answer false if they refer to genuinely different things.

${list}

Return ONLY a JSON array of booleans, one per pair, in order. No other text.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body: JSON.stringify({model:'claude-sonnet-5',max_tokens:256,messages:[{role:'user',content:prompt}]})
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `API error ${res.status}`);
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  const verdicts = JSON.parse(text.replace(/```json|```/g, '').trim());
  if (!Array.isArray(verdicts) || verdicts.length !== pairs.length) throw new Error('Unexpected judge response');
  return verdicts;
}

// Returns { ok, mismatches: [{ what, claude, google }] }.
// A judge failure is not treated as a mismatch — an unreachable checker must not
// condemn a lesson that may well be fine. It reports ok with checked: false.
export async function verifyLesson(lesson) {
  const pairs = [
    { what: 'word',     claude: lesson.word?.intent,     google: lesson.word?.meaning },
    { what: 'sentence', claude: lesson.sentence?.intent, google: lesson.sentence?.meaning },
    ...(lesson.roleplay?.lines || []).map((l, i) => (
      { what: `roleplay line ${i + 1}`, claude: l.intent, google: l.english }
    )),
  ].filter(p => p.claude && p.google);

  // Politeness, compared in Hindi. Local and deterministic — no model call — so
  // it stands even when the judge below is unreachable. Lines where either side
  // drops the pronoun are skipped rather than guessed at.
  const register = [
    { what: 'sentence politeness', src: lesson.sentence },
    ...(lesson.roleplay?.lines || []).map((l, i) => (
      { what: `roleplay line ${i + 1} politeness`, src: l }
    )),
  ].map(({ what, src }) => {
    const meant = hindiRegister(src?.intent_hi), got = hindiRegister(src?.hindi);
    return (meant && got && meant !== got) ? { what, claude: meant, google: got } : null;
  }).filter(Boolean);

  const uncertain = pairs.filter(p => similarity(p.claude, p.google) < CLEARLY_AGREE);
  if (!uncertain.length) return { ok: !register.length, checked: true, mismatches: register };

  let verdicts;
  try {
    verdicts = await judge(uncertain);
  } catch (e) {
    return { ok: !register.length, checked: false, mismatches: register };
  }

  const mismatches = [...uncertain.filter((_, i) => verdicts[i] === false), ...register];
  return { ok: mismatches.length === 0, checked: true, mismatches };
}
