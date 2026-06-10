'use strict';

const crypto = require('crypto');

/**
 * LRU Map with max size enforcement and periodic TTL cleanup.
 * Falls back to in-memory store; optionally wraps a Redis client.
 */
function createCacheStore(config, redisClient) {
  const cacheConfig = config.cache || {};
  const ttl = (cacheConfig.ttl || 60) * 1000;
  const maxSize = cacheConfig.maxSize || 500;
  const redisPrefix = cacheConfig.redisPrefix || 'cache:';

  // In-memory LRU store
  const memStore = new Map();
  const keyOrder = []; // insertion order for LRU eviction

  // Periodic TTL cleanup every 60s
  let cleanupTimer;
  function startCleanup() {
    if (cleanupTimer) return;
    cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of memStore) {
        if (now - v.timestamp >= ttl) {
          memStore.delete(k);
          const idx = keyOrder.indexOf(k);
          if (idx !== -1) keyOrder.splice(idx, 1);
        }
      }
    }, 60000);
    if (cleanupTimer.unref) cleanupTimer.unref();
  }
  function stopCleanup() {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }

  function evictIfNeeded() {
    while (memStore.size >= maxSize && keyOrder.length > 0) {
      const oldest = keyOrder.shift();
      memStore.delete(oldest);
    }
  }

  return {
    async get(key) {
      // Try Redis first
      if (redisClient) {
        try {
          const raw = await redisClient.get(redisPrefix + key);
          if (raw) return JSON.parse(raw);
        } catch { /* fall through */ }
      }
      // Fallback to memory
      const cached = memStore.get(key);
      if (!cached) return null;
      if (Date.now() - cached.timestamp >= ttl) {
        memStore.delete(key);
        const idx = keyOrder.indexOf(key);
        if (idx !== -1) keyOrder.splice(idx, 1);
        return null;
      }
      // LRU bump
      const idx = keyOrder.indexOf(key);
      if (idx !== -1) keyOrder.splice(idx, 1);
      keyOrder.push(key);
      return cached.body;
    },
    async set(key, body) {
      const entry = { body, timestamp: Date.now() };
      if (redisClient) {
        try {
          await redisClient.setEx(redisPrefix + key, Math.ceil(ttl / 1000), JSON.stringify(body));
        } catch { /* fall through */ }
      }
      if (!memStore.has(key)) {
        evictIfNeeded();
        keyOrder.push(key);
      }
      memStore.set(key, entry);
    },
    async invalidate(pattern) {
      if (redisClient) {
        try {
          const keys = await redisClient.keys(redisPrefix + pattern);
          if (keys.length) await redisClient.del(keys);
        } catch { /* fall through */ }
      }
      for (const k of memStore.keys()) {
        if (k.includes(pattern.replace('*', ''))) {
          memStore.delete(k);
          const idx = keyOrder.indexOf(k);
          if (idx !== -1) keyOrder.splice(idx, 1);
        }
      }
    },
    startCleanup,
    stopCleanup,
  };
}

function createCacheMiddleware(config, redisClient) {
  const cacheConfig = config.cache || {};
  const ttl = cacheConfig.ttl || 60;
  const enabled = cacheConfig.enabled || false;
  const store = createCacheStore(config, redisClient);

  store.startCleanup();

  function cacheMiddleware(req, res, next) {
    if (!enabled || req.method !== 'GET') return next();
    if (req.path.startsWith('/health') || req.path.startsWith('/ready') || req.path.startsWith('/metrics')) {
      return next();
    }

    const key = `${req.originalUrl}`;

    store.get(key).then((cached) => {
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        res.status(200).json(cached);
        return;
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          store.set(key, body);
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        }
        return originalJson(body);
      };

      next();
    }).catch(() => next());
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

  function staticCacheMiddleware(/* maxAge */) {
    return (req, res, next) => {
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
        const isHashed = req.path.match(/[.-][a-f0-9]{8,}\./);
        res.setHeader('Cache-Control', `public, max-age=${isHashed ? 31536000 : 86400}, immutable`);
      }
      next();
    };
  }

  return {
    cacheMiddleware, etagMiddleware, staticCacheMiddleware, store,
  };
}

module.exports = { createCacheMiddleware };
