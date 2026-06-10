'use strict';

function createShutdownHandler(server, sequelize, redisClient, logger, config) {
  const timeout = config.shutdownTimeout || 30000;
  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    const forceExit = setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      if (process.exit) process.exit(1);
    }, timeout);

    try {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
        logger.info('HTTP server closed');
      }

      if (sequelize) {
        await sequelize.close();
        logger.info('Database connection closed');
      }

      if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed');
      }

      clearTimeout(forceExit);
      logger.info('Graceful shutdown completed');
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      clearTimeout(forceExit);
    }
  }

  function registerShutdownHandlers() {
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise rejection', { error: reason?.message || reason });
      shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message, stack: err.stack });
      if (process.exit) process.exit(1);
    });
  }

  return { shutdown, registerShutdownHandlers };
}

module.exports = { createShutdownHandler };
