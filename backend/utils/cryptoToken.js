const crypto = require('crypto');

/** Raw token to send in email / URL (hex string). */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Store only the hash in MongoDB so a DB leak does not expose usable reset links. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

module.exports = {
  generateSecureToken,
  hashToken,
};
