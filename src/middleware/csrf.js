'use strict';

const crypto = require('crypto');

function createCsrfMiddleware(config, redisClient) {
  if (!config.csrf) {
    return (req, res, next) => next();
  }

  const secret = config.sessionSecret || crypto.randomBytes(32).toString('hex');

  // Track used tokens to prevent replay (in-memory set, optionally Redis)
  const usedTokens = new Set();

  async function markUsed(token) {
    usedTokens.add(token);
    if (redisClient) {
      try {
        await redisClient.setEx(`csrf:used:${token}`, 86400, '1');
      } catch { /* fall through */ }
    }
  }

  async function isUsed(token) {
    if (usedTokens.has(token)) return true;
    if (redisClient) {
      try {
        const exists = await redisClient.get(`csrf:used:${token}`);
        if (exists) return true;
      } catch { /* fall through */ }
    }
    return false;
  }

  function generateToken(req) {
    const timestamp = Date.now().toString(36);
    const nonce = crypto.randomBytes(8).toString('hex');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(`${req.id || ''}:${timestamp}:${nonce}`)
      .digest('hex');
    return `${timestamp}.${nonce}.${hash}`;
  }

  function validateToken(req, token) {
    if (!token || !token.includes('.')) return false;
    const parts = token.split('.');
    if (parts.length < 3) return false;
    const [timestamp, nonce, hash] = parts;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${req.id || ''}:${timestamp}:${nonce}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
  }

  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      res.cookie('csrf-token', generateToken(req), {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.protocol === 'https',
      });
      return next();
    }

    const token = req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.body?._csrf;
    if (!token || !validateToken(req, token)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // Replay protection
    isUsed(token).then((used) => {
      if (used) {
        return res.status(403).json({ error: 'CSRF token already used' });
      }
      markUsed(token);
      next();
    }).catch(() => next());
  };
}

module.exports = { createCsrfMiddleware };
