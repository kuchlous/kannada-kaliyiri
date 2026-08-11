const { clearSession } = require('../_lib/auth');

module.exports = (req, res) => {
  clearSession(res);
  res.status(200).json({ ok: true });
};
