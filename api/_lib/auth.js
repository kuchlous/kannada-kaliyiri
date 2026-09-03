const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const COOKIE = 'kk_session';
const MAX_AGE = 365 * 24 * 3600;

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  return cookies;
}

function getSession(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  try { return jwt.verify(token, SECRET); }
  catch(e) { return null; }
}

function setSession(res, payload) {
  const token = jwt.sign(payload, SECRET, { expiresIn: '365d' });
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token};HttpOnly;Path=/;Max-Age=${MAX_AGE};SameSite=Lax;Secure`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=;HttpOnly;Path=/;Max-Age=0;SameSite=Lax;Secure`);
}

module.exports = { getSession, setSession, clearSession };
