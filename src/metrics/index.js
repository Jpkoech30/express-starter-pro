'use strict';

const promClient = require('prom-client');

function createMetrics(config) {
  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });

  const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [register],
  });

  const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  const activeConnections = new promClient.Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections',
    registers: [register],
  });

  const dbPoolSize = new promClient.Gauge({
    name: 'db_pool_size',
    help: 'Database connection pool size',
    labelNames: ['state'],
    registers: [register],
  });

  const dbQueryDuration = new promClient.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['model', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register],
  });

  function trackRequest(req, res, durationMs) {
    const route = req.route ? req.route.path : (req.path || 'unknown');
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationMs / 1000);
  }

  function updateDbPool(pool) {
    if (!pool) return;
    try {
      const numUsed = pool.numUsed || pool.used || 0;
      const numFree = pool.numFree || pool.idle || 0;
      const numPending = pool.numPending || pool.pending || 0;
      dbPoolSize.set({ state: 'used' }, numUsed);
      dbPoolSize.set({ state: 'idle' }, numFree);
      dbPoolSize.set({ state: 'pending' }, numPending);
    } catch (_) {
      // pool metrics not available
    }
  }

  function trackDbQuery(model, operation, durationMs) {
    dbQueryDuration.observe({ model, operation }, durationMs / 1000);
  }

  function incrementActiveConnections() {
    activeConnections.inc();
  }

  function decrementActiveConnections() {
    activeConnections.dec();
  }

  async function getMetrics() {
    return register.metrics();
  }

  return {
    register,
    trackRequest,
    updateDbPool,
    trackDbQuery,
    incrementActiveConnections,
    decrementActiveConnections,
    getMetrics,
    httpRequestsTotal,
    httpRequestDuration,
    activeConnections,
    dbPoolSize,
    dbQueryDuration,
  };
}

module.exports = { createMetrics };
