/**
 * MongoDB: `{ deletedAt: null }` matches documents where the field is missing or explicitly null,
 * but not soft-deleted events (deletedAt is a Date).
 */
const EVENT_ACTIVE = { deletedAt: null };

module.exports = { EVENT_ACTIVE };
