import { Express, Request, Response, NextFunction } from 'express';
import { Sequelize } from 'sequelize';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export interface DatabaseConfig {
  url?: string | null;
  dialect?: 'postgres' | 'mysql' | 'sqlite' | 'mariadb' | 'mssql';
  storage?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  pool?: {
    max?: number;
    min?: number;
    acquire?: number;
    idle?: number;
  };
  retry?: {
    max?: number;
    backoffBase?: number;
    backoffExponent?: number;
  };
  sync?: boolean | { alter?: boolean; force?: boolean };
  queryTimeout?: number | null;
  logging?: boolean | ((msg: string) => void);
}

export interface RedisConfig {
  url?: string | null;
  enabled?: boolean;
}

export interface CacheConfig {
  ttl?: number;
  enabled?: boolean;
}

export interface CompressionConfig {
  level?: number;
  threshold?: number;
}

export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  [key: string]: unknown;
}

export interface LoggerInterface {
  error(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
}

export interface AppConfig {
  port?: number;
  nodeEnv?: 'development' | 'production' | 'test';
  helmet?: boolean | Record<string, unknown>;
  cors?: boolean | Record<string, unknown>;
  compression?: boolean | CompressionConfig;
  morgan?: boolean | string;
  cookieParser?: boolean | string;
  rateLimit?: boolean | RateLimitConfig;
  session?: boolean;
  jsonLimit?: string;
  urlencodedLimit?: string;
  staticDir?: boolean | string;
  requestId?: boolean;
  timeout?: boolean | number;
  csrf?: boolean;
  xssClean?: boolean;
  hpp?: boolean;
  noCacheAuthRoutes?: boolean;
  cache?: boolean | CacheConfig;
  logger?: LoggerInterface | null;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  database?: DatabaseConfig;
  redis?: RedisConfig;
  sessionSecret?: string | null;
  shutdownTimeout?: number;
  models?: string;
  transactionMiddleware?: boolean;
}

export interface MetricsInterface {
  register: Registry;
  trackRequest(req: Request, res: Response, durationMs: number): void;
  updateDbPool(pool: unknown): void;
  trackDbQuery(model: string, operation: string, durationMs: number): void;
  incrementActiveConnections(): void;
  decrementActiveConnections(): void;
  getMetrics(): Promise<string>;
  httpRequestsTotal: Counter<string>;
  httpRequestDuration: Histogram<string>;
  activeConnections: Gauge<string>;
  dbPoolSize: Gauge<string>;
  dbQueryDuration: Histogram<string>;
}

export interface CreateAppResult {
  app: Express;
  ready: Promise<void>;
  shutdown: () => Promise<void>;
  sequelize?: Sequelize;
  metrics: MetricsInterface;
}

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    log?: LoggerInterface;
    transaction?: unknown;
  }
}

export function createApp(config?: AppConfig): Promise<CreateAppResult>;
