const { getSession } = require('./_lib/auth');

module.exports = (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  res.status(200).json({ userId: session.userId, email: session.email });
};
