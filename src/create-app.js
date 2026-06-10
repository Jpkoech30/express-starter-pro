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

async function createApp(userConfig = {}) {
  // Extract non-config options before validation strips them
  const beforeRoutes = userConfig.beforeRoutes;
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

  // 6. Session
  if (config.session) {
    app.use(session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: config.nodeEnv === 'production' },
    }));
  }

  // 7. Rate limit
  if (config.rateLimit) {
    const rlOpts = typeof config.rateLimit === 'object' ? config.rateLimit : {};
    app.use(rateLimit({
      windowMs: rlOpts.windowMs || 15 * 60 * 1000,
      max: rlOpts.max || 100,
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

  // 8. CSRF
  app.use(createCsrfMiddleware(config));

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

  // 14. Cache
  const cacheMiddleware = createCacheMiddleware(config);
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

  // Built-in routes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (req, res) => {
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

  // 404 handler
  app.use(notFoundHandler);

  // Central error handler
  app.use(createErrorHandler(config));

  // Shutdown
  const { shutdown, registerShutdownHandlers } = createShutdownHandler(
    null, sequelize, null, logger, config,
  );

  registerShutdownHandlers();

  return {
    app,
    ready,
    shutdown: () => shutdown('manual'),
    sequelize,
    metrics,
  };
}

module.exports = { createApp };
