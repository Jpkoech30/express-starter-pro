'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function createLogger(config) {
  if (config.logger) {
    return wrapCustomLogger(config.logger, config);
  }
  return createConsoleLogger(config);
}

function wrapCustomLogger(customLogger, config) {
  const level = LEVELS[config.logLevel] || LEVELS.info;
  const methods = ['error', 'warn', 'info', 'debug'];
  const wrapped = {};

  methods.forEach((m) => {
    if (LEVELS[m] > level) {
      wrapped[m] = () => {};
      return;
    }
    wrapped[m] = (msg, meta = {}) => {
      if (typeof customLogger[m] === 'function') {
        customLogger[m](msg, { ...meta, timestamp: new Date().toISOString() });
      }
    };
  });

  wrapped.child = () => wrapped;
  wrapped.level = config.logLevel;
  return wrapped;
}

function createConsoleLogger(config) {
  const isProd = config.nodeEnv === 'production';
  const level = LEVELS[config.logLevel] || LEVELS.info;

  function log(levelName, levelValue, msg, meta = {}) {
    if (levelValue > level) return;

    const entry = {
      level: levelName,
      message: msg,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (isProd) {
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      const prefix = `[${entry.timestamp}] [${levelName.toUpperCase()}]`;
      const reqId = meta.reqId ? ` [req:${meta.reqId}]` : '';
      const stack = meta.stack ? `\n${meta.stack}` : '';
      const colorMap = { error: 31, warn: 33, info: 36, debug: 90 };
      const color = colorMap[levelName] || 0;
      process.stdout.write(`\x1b[${color}m${prefix}${reqId}\x1b[0m ${msg}${stack}\n`);
      if (Object.keys(meta).length > 0 && !meta.reqId && !meta.stack) {
        process.stdout.write(`  ${JSON.stringify(meta)}\n`);
      }
    }
  }

  const logger = {
    error: (msg, meta) => log('error', 0, msg, meta),
    warn: (msg, meta) => log('warn', 1, msg, meta),
    info: (msg, meta) => log('info', 2, msg, meta),
    debug: (msg, meta) => log('debug', 3, msg, meta),
    child: () => logger,
    level: config.logLevel,
  };

  return logger;
}

module.exports = { createLogger };
