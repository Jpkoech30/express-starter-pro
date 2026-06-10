'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const onFinished = require('on-finished');
const { loadConfig } = require('./config/loader');
const { createLogger } = require('./logger');
const { createMetrics } = require('./metrics');
const { requestIdMiddleware } = require('./middleware/request-id');
const { timeoutMiddleware } = require('./middleware/timeout');
const { createCacheMiddleware } = require('./middleware/cache');
const { createCsrfMiddleware } = require('./middleware/csrf');
const { createSecurityMiddleware } = require('./middleware/security');
const { createErrorHandler, notFoundHandler } = require('./middleware/error-handler');
const { createSequelize } = require('./sequelize');
const { createTransactionMiddleware } = require('./sequelize/transaction');
const { createShutdownHandler } = require('./shutdown');
const { createSwaggerMiddleware } = require('./middleware/swagger');

async function createApp(userConfig = {}) {
  // Extract non-config options before validation strips them
  const { beforeRoutes, afterRoutes } = userConfig;
  const config = loadConfig(userConfig);

  // Runtime validation: session requires sessionSecret
  if (config.session && !config.sessionSecret) {
    throw new Error('sessionSecret is required when session is enabled');
  }

  const logger = createLogger(config);
  const metrics = createMetrics(config);

  const app = express();

  // Attach logger to req
  app.use((req, res, next) => {
    req.log = logger;
    next();
  });

  // Initialize Redis client if enabled
  let redisClient;
  if (config.redis && config.redis.enabled && config.redis.url) {
    try {
      const redis = require('redis');
      redisClient = redis.createClient({ url: config.redis.url });
      redisClient.on('error', (err) => logger.warn('Redis connection error', { error: err.message }));
      await redisClient.connect();
      logger.info('Redis client connected');
    } catch (err) {
      logger.warn('Redis connection failed, proceeding without Redis', { error: err.message });
      redisClient = null;
    }
  }

  // 1. Request ID
  if (config.requestId !== false) {
    app.use(requestIdMiddleware);
  }

  // 2. Helmet
  if (config.helmet) {
    const helmetOpts = typeof config.helmet === 'object' ? config.helmet : {};
    app.use(helmet(helmetOpts));
  }

  // 3. CORS
  if (config.cors) {
    const corsOpts = typeof config.cors === 'object' ? config.cors : {};
    app.use(cors(corsOpts));
  }

  // 4. Compression
  if (config.compression) {
    const compOpts = typeof config.compression === 'object' ? config.compression : {};
    app.use(compression(compOpts));
  }

  // 5. Cookie parser
  if (config.cookieParser) {
    const secret = typeof config.cookieParser === 'string' ? config.cookieParser : undefined;
    app.use(cookieParser(secret));
  }

  // 6. Session (with optional Redis store)
  if (config.session) {
    let store;
    if (redisClient) {
      const RedisStore = require('connect-redis').default;
      store = new RedisStore({ client: redisClient, prefix: 'session:' });
    }
    app.use(session({
      store,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: config.nodeEnv === 'production' },
    }));
  }

  // 7. Rate limit (with optional Redis store)
  if (config.rateLimit) {
    const rlOpts = typeof config.rateLimit === 'object' ? config.rateLimit : {};
    let rateLimitStore;
    if (redisClient && rlOpts.store !== false) {
      const { RedisStore } = require('rate-limit-redis');
      rateLimitStore = new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'ratelimit:',
      });
    }
    app.use(rateLimit({
      windowMs: rlOpts.windowMs || 15 * 60 * 1000,
      max: rlOpts.max || 100,
      store: rateLimitStore,
      keyGenerator: (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        const userId = req.session?.userId || req.user?.id;
        return userId ? `${ip}:${userId}` : ip;
      },
      handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, try again later' });
      },
      ...rlOpts,
    }));
  }

  // 8. CSRF (with optional Redis token tracking)
  app.use(createCsrfMiddleware(config, redisClient));

  // 9. Body parsers
  app.use(express.json({ limit: config.jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.urlencodedLimit }));

  // 10. Security (xss-clean, hpp, no-cache)
  const securityMiddlewares = createSecurityMiddleware(config);
  securityMiddlewares.forEach((mw) => app.use(mw));

  // 11. Morgan logging
  if (config.morgan) {
    const morganFormat = typeof config.morgan === 'string' ? config.morgan : 'dev';
    app.use(morgan(morganFormat, {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }));
  }

  // 12. Timeout
  if (config.timeout) {
    const timeoutMs = typeof config.timeout === 'number' ? config.timeout : 30000;
    app.use(timeoutMiddleware(timeoutMs));
  }

  // 13. Static files
  if (config.staticDir) {
    const staticPath = typeof config.staticDir === 'string' ? config.staticDir : 'public';
    app.use(express.static(staticPath));
  }

  // 14. Cache (with optional Redis backend + LRU eviction)
  const cacheMiddleware = createCacheMiddleware(config, redisClient);
  if (config.cache && config.cache.enabled) {
    app.use(cacheMiddleware.cacheMiddleware);
  }
  app.use(cacheMiddleware.etagMiddleware);

  // 15. Metrics tracking
  app.use((req, res, next) => {
    metrics.incrementActiveConnections();
    const start = Date.now();
    onFinished(res, () => {
      metrics.decrementActiveConnections();
      metrics.trackRequest(req, res, Date.now() - start);
    });
    next();
  });

  // Initialize Sequelize
  let sequelize;
  let readyResolve;
  const ready = new Promise((resolve) => { readyResolve = resolve; });

  try {
    sequelize = await createSequelize(config, logger);
    metrics.updateDbPool(sequelize.connectionManager.pool);

    // Transaction middleware
    if (config.transactionMiddleware && sequelize) {
      app.use(createTransactionMiddleware(sequelize));
    }

    readyResolve();
    logger.info('App is ready');
  } catch (err) {
    logger.error('Failed to initialize database', { error: err.message });
    readyResolve();
    throw err;
  }

  // User-defined routes (injected before built-in routes)
  if (typeof beforeRoutes === 'function') {
    beforeRoutes(app);
  }

  // Swagger / OpenAPI
  const swaggerMiddleware = createSwaggerMiddleware(config);
  if (swaggerMiddleware) {
    app.use(swaggerMiddleware.middleware);
  }

  // Built-in routes (customizable health check paths)
  const healthPath = config.healthCheck?.path || '/health';
  const readyPath = config.healthCheck?.readyPath || '/ready';

  app.get(healthPath, (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get(readyPath, async (req, res) => {
    try {
      if (sequelize) {
        await sequelize.authenticate();
      }
      res.json({ status: 'ready' });
    } catch (err) {
      res.status(503).json({ status: 'not ready', error: err.message });
    }
  });

  app.get('/metrics', async (req, res) => {
    try {
      const data = await metrics.getMetrics();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  // User-defined routes (injected after built-in routes)
  if (typeof afterRoutes === 'function') {
    afterRoutes(app);
  }

  // 404 handler
  app.use(notFoundHandler);

  // Central error handler
  app.use(createErrorHandler(config));

  // Shutdown — server reference set later via setServer()
  const shutdownHandler = createShutdownHandler(null, sequelize, redisClient, logger, config);
  const { shutdown, registerShutdownHandlers, setServer } = shutdownHandler;

  registerShutdownHandlers();

  return {
    app,
    ready,
    shutdown: () => shutdown('manual'),
    sequelize,
    metrics,
    redisClient,
    setServer,
  };
}

module.exports = { createApp };
