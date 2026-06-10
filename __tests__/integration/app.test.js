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
        app.get('/slow', (_req, _res) => {
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

  // --- New tests for improvements ---

  test('customizable health check path', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      healthCheck: { path: '/status' },
    });
    const res = await request(appInstance.app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('customizable ready check path', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      healthCheck: { readyPath: '/live' },
    });
    const res = await request(appInstance.app).get('/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  test('afterRoutes hook runs after built-in routes', async () => {
    let afterCalled = false;
    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      afterRoutes: (app) => {
        afterCalled = true;
        app.get('/after-route', (req, res) => res.json({ from: 'after' }));
      },
    });
    expect(afterCalled).toBe(true);
    const res = await request(appInstance.app).get('/after-route');
    expect(res.status).toBe(200);
    expect(res.body.from).toBe('after');
  });

  test('beforeRoutes hook runs before built-in routes', async () => {
    let beforeCalled = false;
    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      beforeRoutes: (app) => {
        beforeCalled = true;
        app.get('/before-route', (req, res) => res.json({ from: 'before' }));
      },
    });
    expect(beforeCalled).toBe(true);
    const res = await request(appInstance.app).get('/before-route');
    expect(res.status).toBe(200);
    expect(res.body.from).toBe('before');
  });

  test('swagger endpoint returns spec when enabled', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      swagger: { title: 'Test API', version: '2.0.0' },
    });
    const res = await request(appInstance.app).get('/api-docs');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Test API');
    expect(res.body.info.version).toBe('2.0.0');
  });

  test('swagger disabled by default', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    const res = await request(appInstance.app).get('/api-docs');
    expect(res.status).toBe(404);
  });

  test('setServer is exposed in result', async () => {
    appInstance = await createApp({ nodeEnv: 'test', database: { sync: false } });
    expect(typeof appInstance.setServer).toBe('function');
  });

  test('validation middleware rejects invalid body', async () => {
    const { z } = require('zod');
    const { createValidationMiddleware } = require('../../src/middleware/validation');

    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      beforeRoutes: (app) => {
        app.post('/validate', createValidationMiddleware({
          body: z.object({ email: z.string().email() }),
        }), (req, res) => {
          res.json({ ok: true });
        });
      },
    });

    const res = await request(appInstance.app)
      .post('/validate')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('validation middleware accepts valid body', async () => {
    const { z } = require('zod');
    const { createValidationMiddleware } = require('../../src/middleware/validation');

    appInstance = await createApp({
      nodeEnv: 'test',
      database: { sync: false },
      beforeRoutes: (app) => {
        app.post('/validate', createValidationMiddleware({
          body: z.object({ email: z.string().email() }),
        }), (req, res) => {
          res.json({ ok: true, email: req.body.email });
        });
      },
    });

    const res = await request(appInstance.app)
      .post('/validate')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.email).toBe('test@example.com');
  });

  test('cache with maxSize evicts old entries', async () => {
    appInstance = await createApp({
      nodeEnv: 'test',
      cache: { ttl: 60, enabled: true, maxSize: 2 },
      database: { sync: false },
      beforeRoutes: (app) => {
        let counter = 0;
        app.get('/api/:id', (req, res) => {
          counter++;
          res.json({ id: req.params.id, count: counter });
        });
      },
    });

    const res1 = await request(appInstance.app).get('/api/a');
    expect(res1.headers['x-cache']).toBe('MISS');

    const res2 = await request(appInstance.app).get('/api/b');
    expect(res2.headers['x-cache']).toBe('MISS');

    const res3 = await request(appInstance.app).get('/api/c');
    expect(res3.headers['x-cache']).toBe('MISS');

    // 'a' should be evicted (LRU, maxSize=2) — next request is a MISS
    const res4 = await request(appInstance.app).get('/api/a');
    expect(res4.headers['x-cache']).toBe('MISS');
  });
});
