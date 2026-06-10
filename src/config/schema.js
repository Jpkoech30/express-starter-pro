'use strict';

const { z } = require('zod');

const configSchema = z.object({
  port: z.number().int().positive().max(65535)
    .default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  helmet: z.union([z.boolean(), z.object({}).passthrough()]).default(true),
  cors: z.union([z.boolean(), z.object({}).passthrough()]).default(true),
  compression: z.union([z.boolean(), z.object({
    level: z.number().int().min(1).max(9)
      .optional(),
    threshold: z.number().int().positive().optional(),
  }).passthrough()]).default({ level: 6, threshold: 1024 }),
  morgan: z.union([z.boolean(), z.string()]).default('dev'),
  cookieParser: z.union([z.boolean(), z.string()]).default(true),
  rateLimit: z.union([z.boolean(), z.object({
    windowMs: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
    store: z.union([z.string(), z.object({}).passthrough()]).optional(),
  }).passthrough()]).default({ windowMs: 900000, max: 100 }),
  session: z.boolean().default(false),
  jsonLimit: z.string().default('1mb'),
  urlencodedLimit: z.string().default('1mb'),
  staticDir: z.union([z.boolean(), z.string()]).default(false),
  requestId: z.boolean().default(true),
  timeout: z.union([z.boolean(), z.number().int().positive()]).default(30000),
  csrf: z.boolean().default(false),
  xssClean: z.boolean().default(true),
  hpp: z.boolean().default(true),
  noCacheAuthRoutes: z.boolean().default(true),
  cache: z.union([z.boolean(), z.object({
    ttl: z.number().int().positive().optional(),
    enabled: z.boolean().optional(),
    maxSize: z.number().int().positive().optional(),
    redisPrefix: z.string().optional(),
  })]).default({ ttl: 60, enabled: false, maxSize: 500 }),
  logger: z.union([z.object({
    info: z.function(),
    warn: z.function(),
    error: z.function(),
    debug: z.function().optional(),
  }).passthrough(), z.null()]).nullable().default(null),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
  database: z.object({
    url: z.string().nullable().default(null),
    dialect: z.enum(['postgres', 'mysql', 'sqlite', 'mariadb', 'mssql']).default('sqlite'),
    storage: z.string().default(':memory:'),
    host: z.string().optional(),
    port: z.number().int().positive().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    database: z.string().optional(),
    pool: z.object({
      max: z.number().int().positive().default(10),
      min: z.number().int().min(0).default(0),
      acquire: z.number().int().positive().default(30000),
      idle: z.number().int().positive().default(10000),
    }).default({}),
    retry: z.object({
      max: z.number().int().min(0).default(3),
      backoffBase: z.number().int().positive().default(100),
      backoffExponent: z.number().int().positive().default(2),
    }).default({}),
    sync: z.union([z.boolean(), z.object({
      alter: z.boolean().optional(),
      force: z.boolean().optional(),
    })]).default(false),
    queryTimeout: z.number().int().positive().nullable()
      .default(null),
    logging: z.union([z.boolean(), z.function()]).default(false),
  }).default({}),
  redis: z.object({
    url: z.string().nullable().default(null),
    enabled: z.boolean().default(false),
  }).default({}),
  sessionSecret: z.string().nullable().default(null),
  shutdownTimeout: z.number().int().positive().default(30000),
  models: z.string().default('models/**/*.js'),
  transactionMiddleware: z.boolean().default(false),
  // New config options
  healthCheck: z.object({
    path: z.string().default('/health'),
    readyPath: z.string().default('/ready'),
  }).default({}),
  swagger: z.union([z.boolean(), z.object({
    title: z.string().optional(),
    version: z.string().optional(),
    description: z.string().optional(),
    path: z.string().optional(),
  })]).default(false),
  validation: z.object({
    enabled: z.boolean().default(false),
  }).default({}),
});

function validateConfig(config) {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  return result.data;
}

module.exports = { configSchema, validateConfig };
