'use strict';

const request = require('supertest');
const { createApp } = require('../../src/create-app');

jest.setTimeout(30000);

describe('E2E: Full Request Flow with Sequelize (SQLite)', () => {
  let appInstance;

  afterEach(async () => {
    if (appInstance && appInstance.shutdown) {
      await appInstance.shutdown();
    }
  });

  test('complete request lifecycle: health → ready → metrics → shutdown', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      database: {
        dialect: 'sqlite',
        storage: ':memory:',
        sync: { force: true },
        retry: { max: 1, backoffBase: 10, backoffExponent: 2 },
      },
      logLevel: 'error',
      requestId: true,
      helmet: true,
      cors: true,
      compression: true,
      cookieParser: true,
      rateLimit: { windowMs: 60000, max: 1000 },
      timeout: 5000,
    });

    // Wait for DB ready
    await appInstance.ready;

    // 1. Health check
    const healthRes = await request(appInstance.app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('ok');
    expect(healthRes.headers['x-request-id']).toBeDefined();
    expect(healthRes.headers['x-dns-prefetch-control']).toBe('off');

    // 2. Ready check
    const readyRes = await request(appInstance.app).get('/ready');
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('ready');

    // 3. Metrics
    const metricsRes = await request(appInstance.app).get('/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.text).toContain('http_requests_total');

    // 4. 404
    const notFoundRes = await request(appInstance.app).get('/api/unknown');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error).toBe('Not Found');

    // 5. Shutdown
    await appInstance.shutdown();
  });

  test('app returns all expected properties', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      logLevel: 'error',
    });

    expect(appInstance).toHaveProperty('app');
    expect(appInstance).toHaveProperty('ready');
    expect(appInstance).toHaveProperty('shutdown');
    expect(appInstance).toHaveProperty('sequelize');
    expect(appInstance).toHaveProperty('metrics');
    expect(typeof appInstance.shutdown).toBe('function');
    expect(appInstance.ready).toBeInstanceOf(Promise);
  });

  test('handles concurrent requests', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      logLevel: 'error',
    });

    const promises = Array.from({ length: 10 }, () =>
      request(appInstance.app).get('/health'));
    const results = await Promise.all(promises);
    results.forEach((res) => {
      expect(res.status).toBe(200);
    });
  });
});
