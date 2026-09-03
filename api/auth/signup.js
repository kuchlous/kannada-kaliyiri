const bcrypt = require('bcryptjs');
const { kv } = require('@vercel/kv');
const { setSession } = require('../_lib/auth');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const key = `user:${email.toLowerCase()}`;
  if (await kv.get(key)) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = randomUUID();
  await kv.set(key, { email: email.toLowerCase(), passwordHash, userId });
  setSession(res, { userId, email: email.toLowerCase() });
  res.status(200).json({ ok: true });
};
