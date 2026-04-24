const { logger } = require('../utils/logger');

/**
 * @param {string[]} allowedRoles
 */
function requireRoles(...allowedRoles) {
  const flat = allowedRoles.flat();
  return (req, res, next) => {
    const role = req.user?.role;
    if (!req.user || !flat.includes(role)) {
      logger.warn('RBAC denied', { role, allowed: flat, path: req.path });
      return res.status(403).json({
        message: 'You do not have permission to perform this action',
      });
    }
    return next();
  };
}

module.exports = {
  requireRoles,
};
