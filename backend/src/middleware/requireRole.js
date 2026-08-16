const { ForbiddenError } = require('../utils/errors');

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new ForbiddenError('Không có quyền truy cập'));
    }
    next();
  };
}

module.exports = { requireRole };
