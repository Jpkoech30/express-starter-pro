'use strict';

const path = require('path');
const fs = require('fs');
const defaults = require('./defaults');
const { validateConfig } = require('./schema');

function loadConfigFile(projectRoot) {
  try {
    const configPath = path.resolve(projectRoot, 'config.js');
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }
  } catch (_) {
    // config.js not found or invalid, skip
  }
  return {};
}

function loadEnvOverrides() {
  const envMap = {
    PORT: (v) => ({ port: parseInt(v, 10) }),
    DATABASE_URL: (v) => ({ database: { url: v } }),
    SESSION_SECRET: (v) => ({ sessionSecret: v }),
    REDIS_URL: (v) => ({ redis: { url: v, enabled: true } }),
    NODE_ENV: (v) => ({ nodeEnv: v }),
  };

  const overrides = {};
  Object.entries(envMap).forEach(([key, mapper]) => {
    if (process.env[key]) {
      Object.assign(overrides, mapper(process.env[key]));
    }
  });
  return overrides;
}

function loadConfig(userConfig = {}) {
  const projectRoot = process.cwd();
  const fileConfig = loadConfigFile(projectRoot);
  const envOverrides = loadEnvOverrides();

  const merged = {
    ...defaults,
    ...fileConfig,
    ...envOverrides,
    ...userConfig,
    database: {
      ...defaults.database,
      ...(fileConfig.database || {}),
      ...(envOverrides.database || {}),
      ...(userConfig.database || {}),
      pool: {
        ...defaults.database.pool,
        ...((fileConfig.database && fileConfig.database.pool) || {}),
        ...((userConfig.database && userConfig.database.pool) || {}),
      },
      retry: {
        ...defaults.database.retry,
        ...((fileConfig.database && fileConfig.database.retry) || {}),
        ...((userConfig.database && userConfig.database.retry) || {}),
      },
    },
    redis: {
      ...defaults.redis,
      ...(fileConfig.redis || {}),
      ...(envOverrides.redis || {}),
      ...(userConfig.redis || {}),
    },
    cache: {
      ...defaults.cache,
      ...(fileConfig.cache || {}),
      ...(userConfig.cache || {}),
    },
  };

  return validateConfig(merged);
}

module.exports = { loadConfig, loadConfigFile, loadEnvOverrides };
