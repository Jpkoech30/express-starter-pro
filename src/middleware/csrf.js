'use strict';

const crypto = require('crypto');

function createCsrfMiddleware(config) {
  if (!config.csrf) {
    return (req, res, next) => next();
  }

  const secret = config.sessionSecret || crypto.randomBytes(32).toString('hex');

  function generateToken(req) {
    const timestamp = Date.now().toString(36);
    const hash = crypto
      .createHmac('sha256', secret)
      .update(`${req.id || ''}:${timestamp}`)
      .digest('hex');
    return `${timestamp}.${hash}`;
  }

  function validateToken(req, token) {
    if (!token || !token.includes('.')) return false;
    const [timestamp, hash] = token.split('.');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${req.id || ''}:${timestamp}`)
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

    next();
  };
}

module.exports = { createCsrfMiddleware };
