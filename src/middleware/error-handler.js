'use strict';

function createErrorHandler(config) {
  const isDev = config.nodeEnv === 'development';

  return (err, req, res, _next) => {
    const logger = req.log || console;

    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'File too large' });
    }

    const statusCode = err.status || err.statusCode || 500;
    const message = isDev ? err.message : 'Internal server error';

    logger.error(err.message, {
      reqId: req.id,
      statusCode,
      stack: isDev ? err.stack : undefined,
      method: req.method,
      path: req.path,
    });

    if (res.headersSent) return;

    res.status(statusCode).json({
      error: message,
      ...(isDev && { stack: err.stack }),
      ...(isDev && { status: statusCode }),
    });
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found' });
}

module.exports = { createErrorHandler, notFoundHandler };
