'use strict';

const xss = require('xss');
const hpp = require('hpp');

function createSecurityMiddleware(config) {
  const middlewares = [];

  if (config.xssClean !== false) {
    middlewares.push((req, res, next) => {
      if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
      }
      if (req.query && typeof req.query === 'object') {
        sanitizeObject(req.query);
      }
      next();
    });
  }

  if (config.hpp !== false) {
    middlewares.push(hpp());
  }

  if (config.noCacheAuthRoutes !== false) {
    middlewares.push((req, res, next) => {
      if (req.headers.authorization || req.session?.userId) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
  }

  return middlewares;
}

function sanitizeObject(obj) {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key]);
    } else if (obj[key] && typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  });
}

module.exports = { createSecurityMiddleware };
