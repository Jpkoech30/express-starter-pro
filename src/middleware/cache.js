'use strict';

const crypto = require('crypto');

function createCacheMiddleware(config) {
  const cacheConfig = config.cache || {};
  const ttl = cacheConfig.ttl || 60;
  const enabled = cacheConfig.enabled || false;
  const store = new Map();

  function cacheMiddleware(req, res, next) {
    if (!enabled || req.method !== 'GET') return next();
    if (req.path.startsWith('/health') || req.path.startsWith('/ready') || req.path.startsWith('/metrics')) {
      return next();
    }

    const key = `${req.originalUrl}`;
    const cached = store.get(key);

    if (cached && (Date.now() - cached.timestamp < ttl * 1000)) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      res.status(200).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(key, { body, timestamp: Date.now() });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      }
      return originalJson(body);
    };

    next();
  }

  function etagMiddleware(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (!res.headersSent) {
        const hash = crypto.createHash('md5').update(JSON.stringify(body)).digest('hex');
        res.setHeader('ETag', `"${hash}"`);

        if (req.headers['if-none-match'] === `"${hash}"`) {
          res.status(304).end();
          return;
        }
      }
      return originalJson(body);
    };
    next();
  }

  function staticCacheMiddleware(maxAge) {
    return (req, res, next) => {
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
        const isHashed = req.path.match(/[.-][a-f0-9]{8,}\./);
        res.setHeader('Cache-Control', `public, max-age=${isHashed ? 31536000 : 86400}, immutable`);
      }
      next();
    };
  }

  return { cacheMiddleware, etagMiddleware, staticCacheMiddleware };
}

module.exports = { createCacheMiddleware };
