const { validationResult } = require('express-validator');

/**
 * Run after express-validator chains on the same route.
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({
      message: first.msg,
      errors: errors.array(),
    });
  }
  return next();
}

module.exports = { validateRequest };
