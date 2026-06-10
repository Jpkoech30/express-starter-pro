'use strict';

function createShutdownHandler(initialServer, sequelize, redisClient, logger, config) {
  let server = initialServer;
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
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            logger.warn('Server close timed out, forcing');
            resolve();
          }, 10000);
          server.close((err) => {
            clearTimeout(timeoutId);
            if (err) reject(err);
            else resolve();
          });
          // Immediately stop accepting new connections
          server.unref();
        });
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

  function setServer(newServer) {
    server = newServer;
  }

  return { shutdown, registerShutdownHandlers, setServer };
}

module.exports = { createShutdownHandler };
