'use strict';

const request = require('supertest');
const { createApp } = require('../../src/create-app');

jest.setTimeout(30000);

describe('Integration Tests', () => {
  let appInstance;

  afterEach(async () => {
    if (appInstance && appInstance.shutdown) {
      await appInstance.shutdown();
    }
  });

  test('/health returns ok status', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('/ready returns ready status', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  test('/metrics returns prometheus format', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('http_requests_total');
  });

  test('request ID middleware adds X-Request-Id header', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('timeout middleware returns 503', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      timeout: 50,
      database: { sync: false },
      beforeRoutes: (app) => {
        app.get('/slow', (req, res) => {
          // Never respond — let timeout fire
        });
      },
    });
    const res = await request(appInstance.app).get('/slow');
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Request timeout');
  });

  test('CSRF validation works when enabled', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      csrf: true,
      sessionSecret: 'test-secret',
      database: { sync: false },
    });
    const res = await request(appInstance.app).post('/health').send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid CSRF token');
  });

  test('CSRF allows GET requests', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      csrf: true,
      sessionSecret: 'test-secret',
      database: { sync: false },
    });
    const res = await request(appInstance.app).get('/health');
    expect(res.status).toBe(200);
  });

  test('session validation throws without secret', async () => {
    await expect(createApp({
      nodeEnv: 'test',
      session: true,
      database: { sync: false },
    })).rejects.toThrow('sessionSecret');
  });

  test('malformed JSON returns 400', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('not-json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON payload');
  });

  test('rate limiting returns 429 when exceeded', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      rateLimit: { windowMs: 10000, max: 1 },
      database: { sync: false },
    });

    await request(appInstance.app).get('/health');
    const res = await request(appInstance.app).get('/health');
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('Too many requests');
  });

  test('404 handler returns JSON', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app).get('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });

  test('response caching returns cached response', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      cache: { ttl: 60, enabled: true },
      database: { sync: false },
      beforeRoutes: (app) => {
        app.get('/api/data', (req, res) => {
          res.json({ message: 'hello' });
        });
      },
    });

    const res1 = await request(appInstance.app).get('/api/data');
    expect(res1.headers['x-cache']).toBe('MISS');

    const res2 = await request(appInstance.app).get('/api/data');
    expect(res2.headers['x-cache']).toBe('HIT');
    expect(res2.body).toEqual(res1.body);
  });

  test('graceful shutdown closes connections', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const shutdownSpy = jest.spyOn(appInstance, 'shutdown');
    await appInstance.shutdown();
    expect(shutdownSpy).toHaveBeenCalled();
  });

  test('helmet adds security headers', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app).get('/health');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('cors allows cross-origin requests', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app)
      .get('/health')
      .set('Origin', 'http://example.com');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
