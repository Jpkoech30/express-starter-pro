'use strict';

function timeoutMiddleware(ms) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({ error: 'Request timeout', status: 503 });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    next();
  };
}

module.exports = { timeoutMiddleware };
