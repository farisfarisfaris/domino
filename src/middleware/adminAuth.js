const crypto = require('crypto');

function adminAuth(req, res, next) {
  const adminKey = process.env.DOMINO_ADMIN_KEY;

  if (!adminKey) {
    return res.status(500).json({
      error: 'admin_not_configured',
      message: 'Admin API key is not configured on the server',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authorization header is required',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authorization header must be in the format: Bearer <admin_key>',
    });
  }

  const providedKey = parts[1];

  // Constant-time comparison to prevent timing attacks
  if (providedKey.length !== adminKey.length ||
      !crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(adminKey))) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Invalid admin API key',
    });
  }

  next();
}

module.exports = adminAuth;
