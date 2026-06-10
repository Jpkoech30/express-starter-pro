'use strict';

const { loadConfig } = require('../../src/config/loader');

describe('Config Loading', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('loads default values when no config provided', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    // Jest sets NODE_ENV=test, so default picks that up
    expect(config.nodeEnv).toBe('test');
    expect(config.helmet).toBe(true);
    expect(config.cors).toBe(true);
    expect(config.timeout).toBe(30000);
    expect(config.database.dialect).toBe('sqlite');
    expect(config.database.pool.max).toBe(10);
    expect(config.database.retry.max).toBe(3);
  });

  test('userConfig overrides defaults', () => {
    const config = loadConfig({ port: 8080, nodeEnv: 'production' });
    expect(config.port).toBe(8080);
    expect(config.nodeEnv).toBe('production');
  });

  test('environment variables override defaults', () => {
    process.env.PORT = '5000';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://localhost:5432/test';
    const config = loadConfig({});
    expect(config.port).toBe(5000);
    expect(config.nodeEnv).toBe('production');
    expect(config.database.url).toBe('postgres://localhost:5432/test');
  });

  test('userConfig overrides environment variables', () => {
    process.env.PORT = '5000';
    const config = loadConfig({ port: 9000 });
    expect(config.port).toBe(9000);
  });

  test('session validation is done at runtime in createApp, not in loadConfig', () => {
    // loadConfig itself does not validate session+secret (Zod allows it)
    // The validation happens in createApp()
    const config = loadConfig({ session: true });
    expect(config.session).toBe(true);
    expect(config.sessionSecret).toBeNull();
  });

  test('deep merges database config', () => {
    const config = loadConfig({
      database: {
        pool: { max: 20 },
        retry: { max: 5 },
      },
    });
    expect(config.database.pool.max).toBe(20);
    expect(config.database.pool.min).toBe(0);
    expect(config.database.retry.max).toBe(5);
    expect(config.database.retry.backoffBase).toBe(100);
  });

  test('accepts valid config without throwing', () => {
    const config = loadConfig({
      port: 4000,
      nodeEnv: 'test',
      sessionSecret: 'test-secret',
    });
    expect(config.port).toBe(4000);
    expect(config.sessionSecret).toBe('test-secret');
  });
});
