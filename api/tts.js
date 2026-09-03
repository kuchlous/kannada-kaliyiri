module.exports = async (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).end();

  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=kn&client=tw-ob`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    }
  });

  if (!response.ok) return res.status(502).end();

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=604800'); // cache 7 days — same text = same audio
  res.end(Buffer.from(await response.arrayBuffer()));
};
