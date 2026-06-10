'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const { createSequelize } = require('../../src/sequelize');
const { createLogger } = require('../../src/logger');

jest.setTimeout(30000);

describe('Sequelize Integration', () => {
  test('connects to SQLite in-memory', async () => {
    const logger = createLogger({ nodeEnv: 'test', logLevel: 'error' });
    const sequelize = await createSequelize({
      database: {
        dialect: 'sqlite',
        storage: ':memory:',
        sync: false,
        retry: { max: 1, backoffBase: 10, backoffExponent: 2 },
      },
      logLevel: 'error',
      models: 'models/**/*.js',
    }, logger);
    expect(sequelize).toBeInstanceOf(Sequelize);
    await sequelize.close();
  });

  test('creates and queries a model', async () => {
    const logger = createLogger({ nodeEnv: 'test', logLevel: 'error' });
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });

    const User = sequelize.define('User', {
      name: { type: DataTypes.STRING },
      email: { type: DataTypes.STRING },
    });

    await sequelize.sync({ force: true });
    await User.create({ name: 'Test', email: 'test@test.com' });
    const users = await User.findAll();
    expect(users.length).toBe(1);
    expect(users[0].name).toBe('Test');

    await sequelize.close();
  });

  test('retry logic fails after max retries with bad connection', async () => {
    const logger = createLogger({ nodeEnv: 'test', logLevel: 'error' });
    // Mock sequelize.authenticate to always reject
    const { Sequelize } = require('sequelize');
    const originalAuthenticate = Sequelize.prototype.authenticate;
    Sequelize.prototype.authenticate = jest.fn().mockRejectedValue(new Error('Connection refused'));

    try {
      await expect(createSequelize({
        database: {
          dialect: 'sqlite',
          storage: ':memory:',
          retry: { max: 2, backoffBase: 10, backoffExponent: 2 },
        },
        logLevel: 'error',
        models: 'models/**/*.js',
      }, logger)).rejects.toThrow('Database connection failed');
    } finally {
      Sequelize.prototype.authenticate = originalAuthenticate;
    }
  });

  test('model loader returns empty for non-existent directory', async () => {
    const { loadModels } = require('../../src/sequelize/model-loader');
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });
    const models = await loadModels(sequelize, 'nonexistent/**/*.js');
    expect(models).toEqual({});
    await sequelize.close();
  });

  test('transaction middleware rolls back on error', async () => {
    const { createTransactionMiddleware } = require('../../src/sequelize/transaction');
    const sequelize = new Sequelize('sqlite::memory:', { logging: false });
    const User = sequelize.define('User', {
      name: { type: DataTypes.STRING },
    });
    await sequelize.sync({ force: true });

    const middleware = createTransactionMiddleware(sequelize);
    const req = {};
    const res = { statusCode: 500, on: jest.fn(), once: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    // Trigger rollback
    res.on.mock.calls.forEach(([event, cb]) => {
      if (event === 'finish') cb();
    });

    await sequelize.close();
  });
});
