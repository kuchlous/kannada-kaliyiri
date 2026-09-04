const { getSession } = require('./_lib/auth');

// Cloud Translation v2 — the version that accepts a plain API key. v3 requires
// OAuth/service-account credentials, so it is not usable with a bare key.
const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

// A lesson sends the word, the sentence and four roleplay lines — 6 segments.
// The caps are slack above that, and exist so a stolen session cannot run up
// the bill on a key that belongs to the operator rather than the user.
const MAX_SEGMENTS = 24;
const MAX_CHARS = 2000;

module.exports = async (req, res) => {
  if (!getSession(req)) return res.status(401).json({ error: 'Not authenticated' });
  if (req.method !== 'POST') return res.status(405).end();

  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_TRANSLATE_API_KEY is not configured' });

  const { q, source = 'kn', target = 'en' } = req.body || {};
  const segments = Array.isArray(q) ? q : [q];
  if (!segments.length || segments.some(s => typeof s !== 'string' || !s.trim()))
    return res.status(400).json({ error: 'q must be a non-empty string, or an array of them' });
  if (segments.length > MAX_SEGMENTS)
    return res.status(400).json({ error: `At most ${MAX_SEGMENTS} segments per request` });
  if (segments.join('').length > MAX_CHARS)
    return res.status(400).json({ error: 'Payload too large' });

  // POST with a form body rather than a query string, so the key never lands in
  // a URL that a proxy or access log might retain. format=text stops Google
  // HTML-escaping the result — without it "it's" comes back as "it&#39;s".
  const params = new URLSearchParams({ key, source, target, format: 'text' });
  segments.forEach(s => params.append('q', s));

  let data;
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    data = await r.json();
    if (!r.ok) {
      // Surface Google's own message — it distinguishes a bad key from a
      // disabled API from an exhausted quota, which all look alike otherwise.
      return res.status(502).json({ error: data?.error?.message || `Translation failed (${r.status})` });
    }
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the translation service' });
  }

  const translations = (data?.data?.translations || []).map(t => t.translatedText);
  if (translations.length !== segments.length)
    return res.status(502).json({ error: 'Translation service returned an unexpected number of results' });

  res.status(200).json({ translations });
};
