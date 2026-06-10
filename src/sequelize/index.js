'use strict';

const { Sequelize } = require('sequelize');
const { loadModels } = require('./model-loader');

async function createSequelize(config, logger) {
  const dbConfig = config.database;
  const retryConfig = dbConfig.retry;

  let sequelize;

  if (dbConfig.url) {
    sequelize = new Sequelize(dbConfig.url, {
      dialect: dbConfig.dialect,
      pool: dbConfig.pool,
      logging: dbConfig.logging || (config.logLevel === 'debug' ? (msg) => logger.debug(msg) : false),
      retry: { max: retryConfig.max },
    });
  } else {
    sequelize = new Sequelize({
      dialect: dbConfig.dialect,
      storage: dbConfig.dialect === 'sqlite' ? dbConfig.storage : undefined,
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      pool: dbConfig.pool,
      logging: dbConfig.logging || (config.logLevel === 'debug' ? (msg) => logger.debug(msg) : false),
      retry: { max: retryConfig.max },
    });
  }

  if (dbConfig.queryTimeout) {
    sequelize.options.queryTimeout = dbConfig.queryTimeout;
  }

  let lastError;
  for (let attempt = 1; attempt <= retryConfig.max; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info('Database connected successfully');
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < retryConfig.max) {
        const delay = retryConfig.backoffBase * Math.pow(retryConfig.backoffExponent, attempt - 1);
        logger.warn(`Database connection attempt ${attempt}/${retryConfig.max} failed, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  if (lastError) {
    throw new Error(`Database connection failed after ${retryConfig.max} retries: ${lastError.message}`);
  }

  const models = await loadModels(sequelize, config.models);
  logger.info(`Loaded ${Object.keys(models).length} models`);

  if (dbConfig.sync) {
    const syncOpts = typeof dbConfig.sync === 'object' ? dbConfig.sync : {};
    await sequelize.sync(syncOpts);
    logger.info('Database synced', syncOpts);
  }

  return sequelize;
}

module.exports = { createSequelize };
