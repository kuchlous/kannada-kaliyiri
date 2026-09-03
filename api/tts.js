const { getSession } = require('./_lib/auth');

// Google Translate caps a single tts request at ~200 chars; anything longer
// comes back truncated or as an error page, so reject it rather than proxy it.
const MAX_LEN = 200;

module.exports = async (req, res) => {
  if (!getSession(req)) return res.status(401).json({ error: 'Not authenticated' });

  const { text } = req.query;
  if (!text) return res.status(400).end();
  if (text.length > MAX_LEN) return res.status(400).end();

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=kn&client=tw-ob`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    }
  });

  if (!response.ok) return res.status(502).end();

  res.setHeader('Content-Type', 'audio/mpeg');
  // Private: the response is per-user only because of the auth gate above, and
  // the audio itself is not secret — but a shared cache keyed on the URL alone
  // would serve it to signed-out callers.
  res.setHeader('Cache-Control', 'private, max-age=604800'); // cache 7 days — same text = same audio
  res.end(Buffer.from(await response.arrayBuffer()));
};
