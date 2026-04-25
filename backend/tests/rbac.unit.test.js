/**
 * Unit tests for pure RBAC helpers (no database).
 */
const {
  normalizeRole,
  roleRank,
  isHigherOrEqualRole,
  canManageTarget,
} = require('../utils/rbac');

describe('rbac', () => {
  it('normalizeRole maps aliases to canonical roles', () => {
    expect(normalizeRole('STUDENT')).toBe('student');
    expect(normalizeRole('FACULTY_COORDINATOR')).toBe('facultyCoordinator');
    expect(normalizeRole('admin')).toBe('admin');
  });

  it('roleRank orders hierarchy (lower index = higher privilege)', () => {
    expect(roleRank('superAdmin')).toBeLessThan(roleRank('admin'));
    expect(roleRank('admin')).toBeLessThan(roleRank('student'));
  });

  it('isHigherOrEqualRole compares correctly', () => {
    expect(isHigherOrEqualRole('admin', 'student')).toBe(true);
    expect(isHigherOrEqualRole('student', 'admin')).toBe(false);
  });

  it('canManageTarget allows superAdmin for any target', () => {
    expect(canManageTarget('superAdmin', 'admin')).toBe(true);
  });

  it('canManageTarget restricts admin from managing superAdmin', () => {
    expect(canManageTarget('admin', 'superAdmin')).toBe(false);
  });
});
