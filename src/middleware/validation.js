'use strict';

/**
 * Zod request validation middleware.
 * Validates req.body, req.query, req.params against Zod schemas.
 */
function createValidationMiddleware(schemas = {}) {
  return (req, res, next) => {
    const promises = [];

    if (schemas.body && req.body) {
      promises.push(
        schemas.body.safeParseAsync(req.body).then((result) => {
          if (!result.success) {
            const errors = result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            }));
            const err = new Error('Validation failed');
            err.status = 400;
            err.details = errors;
            throw err;
          }
          req.body = result.data;
        })
      );
    }

    if (schemas.query && req.query) {
      promises.push(
        schemas.query.safeParseAsync(req.query).then((result) => {
          if (!result.success) {
            const errors = result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            }));
            const err = new Error('Query validation failed');
            err.status = 400;
            err.details = errors;
            throw err;
          }
          req.query = result.data;
        })
      );
    }

    if (schemas.params && req.params) {
      promises.push(
        schemas.params.safeParseAsync(req.params).then((result) => {
          if (!result.success) {
            const errors = result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            }));
            const err = new Error('Params validation failed');
            err.status = 400;
            err.details = errors;
            throw err;
          }
          req.params = result.data;
        })
      );
    }

    Promise.all(promises)
      .then(() => next())
      .catch((err) => {
        if (err.status) {
          res.status(err.status).json({ error: err.message, details: err.details });
        } else {
          next(err);
        }
      });
  };
}

module.exports = { createValidationMiddleware };
