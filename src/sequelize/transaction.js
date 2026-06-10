'use strict';

function createTransactionMiddleware(sequelize) {
  return (req, res, next) => {
    sequelize.transaction((t) => {
      req.transaction = t;
      return new Promise((resolve, reject) => {
        res.on('finish', () => {
          if (res.statusCode < 400) {
            resolve();
          } else {
            reject(new Error('Rollback on error'));
          }
        });
        res.on('close', () => reject(new Error('Connection closed')));
        next();
      });
    }).catch((err) => {
      if (err.message !== 'Rollback on error' && err.message !== 'Connection closed') {
        next(err);
      }
    });
  };
}

module.exports = { createTransactionMiddleware };
