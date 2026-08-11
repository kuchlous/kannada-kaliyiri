const { kv } = require('@vercel/kv');
const { getSession } = require('./_lib/auth');

module.exports = async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const { userId } = session;
  if (req.method === 'GET') {
    const data = await kv.get(`data:${userId}`) || {};
    return res.status(200).json(data);
  }
  if (req.method === 'PUT') {
    await kv.set(`data:${userId}`, req.body);
    return res.status(200).json({ ok: true });
  }
  res.status(405).end();
};
