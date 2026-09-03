const bcrypt = require('bcryptjs');
const { kv } = require('@vercel/kv');
const { setSession } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = await kv.get(`user:${email.toLowerCase()}`);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: 'Invalid email or password' });
  setSession(res, { userId: user.userId, email: user.email });
  res.status(200).json({ ok: true });
};
