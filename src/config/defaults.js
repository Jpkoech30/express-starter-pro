'use strict';

const defaults = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  helmet: true,
  cors: true,
  compression: { level: 6, threshold: 1024 },
  morgan: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  cookieParser: true,
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  session: false,
  jsonLimit: '1mb',
  urlencodedLimit: '1mb',
  staticDir: false,
  requestId: true,
  timeout: 30000,
  csrf: false,
  xssClean: true,
  hpp: true,
  noCacheAuthRoutes: true,
  cache: { ttl: 60, enabled: false },
  logger: null,
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  database: {
    url: process.env.DATABASE_URL || null,
    dialect: 'sqlite',
    storage: ':memory:',
    pool: {
      max: 10, min: 0, acquire: 30000, idle: 10000,
    },
    retry: { max: 3, backoffBase: 100, backoffExponent: 2 },
    sync: false,
    queryTimeout: null,
    logging: false,
  },
  redis: {
    url: process.env.REDIS_URL || null,
    enabled: false,
  },
  sessionSecret: process.env.SESSION_SECRET || null,
  shutdownTimeout: 30000,
  models: 'models/**/*.js',
  transactionMiddleware: false,
};

module.exports = defaults;
