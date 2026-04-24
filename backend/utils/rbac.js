const ROLE_HIERARCHY = [
  'superAdmin',
  'admin',
  'organizer',
  'facultyCoordinator',
  'staff',
  'student',
];

const ROLE_ALIAS = {
  SUPER_ADMIN: 'superAdmin',
  SUPERADMIN: 'superAdmin',
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  FACULTY_COORDINATOR: 'facultyCoordinator',
  FACULTYCOORDINATOR: 'facultyCoordinator',
  FACULTY: 'facultyCoordinator',
  STAFF: 'staff',
  STUDENT: 'student',
};

const normalizeRole = (role) => {
  const raw = String(role || '').trim();
  if (!raw) return '';
  if (ROLE_HIERARCHY.includes(raw)) return raw;
  const upper = raw.toUpperCase();
  if (ROLE_ALIAS[upper]) return ROLE_ALIAS[upper];
  return raw;
};

const roleRank = (role) => {
  const idx = ROLE_HIERARCHY.indexOf(normalizeRole(role));
  return idx === -1 ? Number.POSITIVE_INFINITY : idx;
};

const isHigherOrEqualRole = (actorRole, targetRole) =>
  roleRank(actorRole) <= roleRank(targetRole);

const isHigherRole = (actorRole, targetRole) =>
  roleRank(actorRole) < roleRank(targetRole);

const canManageTarget = (actorRole, targetRole) => {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (actor === 'superAdmin') return true;
  if (actor !== 'admin') return false;
  return !['superAdmin', 'admin'].includes(target);
};

const canAssignRole = (actorRole, nextRole) => {
  const actor = normalizeRole(actorRole);
  const next = normalizeRole(nextRole);
  if (actor === 'superAdmin') return true;
  if (actor !== 'admin') return false;
  return !['superAdmin', 'admin'].includes(next);
};

module.exports = {
  ROLE_HIERARCHY,
  normalizeRole,
  roleRank,
  isHigherOrEqualRole,
  isHigherRole,
  canManageTarget,
  canAssignRole,
};
