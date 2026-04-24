import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { api, extractErrorMessage } from '@/lib/api'

const MAX_FAILED_ATTEMPTS = 5
const ATTEMPT_WINDOW_MINUTES = 10

const _now = Date.now()
const _hour = 60 * 60 * 1000
const DUMMY_FAILED_ATTEMPTS = [
  { email: 'student1@university.ac.lk', success: false, timestamp: _now - 3 * _hour },
  { email: 'student1@university.ac.lk', success: false, timestamp: _now - 2 * _hour },
  { email: 'student1@university.ac.lk', success: false, timestamp: _now - 1 * _hour },
  { email: 'faculty1@university.ac.lk', success: false, timestamp: _now - 5 * _hour },
  { email: 'faculty1@university.ac.lk', success: false, timestamp: _now - 4 * _hour },
  { email: 'organizer1@university.ac.lk', success: false, timestamp: _now - 6 * _hour },
]

const AuthContext = createContext(null)

function normalizeRoleValue(role) {
  const raw = String(role || '').trim()
  if (!raw) return ''
  if (raw === 'superAdmin') return raw
  const up = raw.toUpperCase()
  if (up === 'SUPER_ADMIN' || up === 'SUPERADMIN') return 'superAdmin'
  if (up === 'ADMIN') return 'admin'
  if (up === 'ORGANIZER') return 'organizer'
  if (up === 'FACULTY_COORDINATOR' || up === 'FACULTYCOORDINATOR') return 'facultyCoordinator'
  if (up === 'STAFF') return 'staff'
  if (up === 'STUDENT') return 'student'
  return raw
}

function mapUser(user) {
  if (!user) return null
  const role = normalizeRoleValue(user.role)
  return {
    id: user.id || user._id,
    email: user.email,
    username: user.name,
    name: user.name,
    role,
    profileImage: user.profileImage || '',
    status: user.status,
    department: user.department,
    phone: user.phone,
    registrationNumber: user.registrationNumber,
    staffId: user.staffId,
    address: user.address,
    bio: user.bio,
    notificationPreferences: user.notificationPreferences,
    roleProfile: user.roleProfile,
  }
}

export function roleHomePath(role) {
  switch (role) {
    case 'student':
    case 'staff':
      return '/student'
    case 'organizer':
      return '/organizer'
    case 'facultyCoordinator':
      return '/faculty'
    case 'admin':
    case 'superAdmin':
      return '/admin'
    default:
      return '/login'
  }
}

export function roleProfilePath(role) {
  switch (role) {
    case 'student':
    case 'staff':
      return '/student/profile'
    case 'organizer':
      return '/organizer/profile'
    case 'facultyCoordinator':
      return '/faculty/profile'
    case 'admin':
    case 'superAdmin':
      return '/admin/profile'
    default:
      return '/student/profile'
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [error, setError] = useState('')

  const [adminUsers, setAdminUsers] = useState([])

  const [loginAttempts, setLoginAttempts] = useState(DUMMY_FAILED_ATTEMPTS)
  const [lockedEmails, setLockedEmails] = useState({})
  const [deactivatedEmails, setDeactivatedEmails] = useState({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.email && parsed.role && parsed.username) {
          setCurrentUser(parsed)
        } else {
          localStorage.removeItem('currentUser')
        }
      }
    } catch {
      localStorage.removeItem('currentUser')
    }
    setIsRestoring(false)
  }, [])

  const mapAdminUserRow = useCallback((u) => ({
    id: u.id,
    email: u.email,
    username: u.name,
    name: u.name,
    role: u.role,
    status: u.status,
    department: u.department || '',
    phone: u.phone || '',
    registrationNumber: u.registrationNumber || '',
    staffId: u.staffId || '',
    profileImage: u.profileImage || '',
    roleProfile: u.roleProfile || {},
    emailVerified: Boolean(u.emailVerified),
  }), [])

  const refreshAdminUsers = useCallback(async (filters = {}) => {
    try {
      const res = await api.get('/api/admin/users', { params: filters })
      const items = res.data?.users ?? []
      setAdminUsers(items.map(mapAdminUserRow))
    } catch {
      /* ignore */
    }
  }, [mapAdminUserRow])

  useEffect(() => {
    if (!currentUser || !['admin', 'superAdmin'].includes(currentUser.role)) return
    refreshAdminUsers()
  }, [currentUser, refreshAdminUsers])

  const recordLoginAttempt = useCallback((email, success) => {
    const normalizedEmail = email.trim().toLowerCase()
    const timestamp = Date.now()
    setLoginAttempts((prev) => {
      const next = [
        ...prev.slice(-199),
        { email: normalizedEmail, success, timestamp },
      ]
      if (!success) {
        setLockedEmails((prevLocked) => {
          const now = Date.now()
          const windowMs = ATTEMPT_WINDOW_MINUTES * 60 * 1000
          const failedForUser = next.filter(
            (a) =>
              a.email === normalizedEmail &&
              !a.success &&
              now - a.timestamp <= windowMs,
          )
          if (failedForUser.length >= MAX_FAILED_ATTEMPTS) {
            if (prevLocked[normalizedEmail]) return prevLocked
            return {
              ...prevLocked,
              [normalizedEmail]: {
                email: normalizedEmail,
                lockedAt: now,
                reason: 'too_many_failed_logins',
                failuresInWindow: failedForUser.length,
              },
            }
          }
          return prevLocked
        })
      }
      return next
    })
  }, [])

  const handleToggleLock = useCallback((email) => {
    const key = email.trim().toLowerCase()
    setLockedEmails((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = {
          email: key,
          lockedAt: Date.now(),
          reason: 'manual_lock',
        }
      }
      return next
    })
  }, [])

  const handleToggleDeactivate = useCallback((email) => {
    const key = email.trim().toLowerCase()
    setDeactivatedEmails((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = {
          email: key,
          deactivatedAt: Date.now(),
          reason: 'admin_decision',
        }
        setLockedEmails((prevLocked) => ({
          ...prevLocked,
          [key]: {
            email: key,
            lockedAt: Date.now(),
            reason: 'deactivated',
          },
        }))
      }
      return next
    })
  }, [])

  const persistSession = useCallback(({ token, refreshToken, user }) => {
    if (token) localStorage.setItem('accessToken', token)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    const mapped = mapUser(user)
    setCurrentUser(mapped)
    try {
      localStorage.setItem('currentUser', JSON.stringify(mapped))
    } catch {
      // non-fatal
    }
    return mapped
  }, [])

  const login = useCallback(
    async (email, password) => {
      const trimmedEmail = email.trim().toLowerCase()
      const trimmedPassword = password.trim()

      if (deactivatedEmails[trimmedEmail]) {
        const msg =
          'Your account has been deactivated. Please contact the administrator.'
        setError(msg)
        recordLoginAttempt(trimmedEmail, false)
        throw new Error(msg)
      }
      if (lockedEmails[trimmedEmail]) {
        const msg =
          'Your account is temporarily locked due to too many failed login attempts.'
        setError(msg)
        throw new Error(msg)
      }

      try {
        const response = await api.post('/api/auth/login', {
          email: trimmedEmail,
          password: trimmedPassword,
        })
        const { token, refreshToken, user } = response.data || {}
        if (!user) {
          const msg = 'Unexpected server response. Please try again.'
          setError(msg)
          recordLoginAttempt(trimmedEmail, false)
          throw new Error(msg)
        }
        const mapped = persistSession({ token, refreshToken, user })
        recordLoginAttempt(trimmedEmail, true)
        setError('')
        return mapped
      } catch (err) {
        const msg = extractErrorMessage(
          err,
          'Unable to connect to server. Please try again later.',
        )
        setError(msg)
        recordLoginAttempt(trimmedEmail, false)
        throw new Error(msg)
      }
    },
    [deactivatedEmails, lockedEmails, persistSession, recordLoginAttempt],
  )

  const register = useCallback(
    async (name, email, password, confirmPassword) => {
      const trimmedName = name.trim()
      const trimmedEmail = email.trim().toLowerCase()
      const trimmedPassword = password.trim()
      const trimmedConfirm = confirmPassword.trim()

      if (!trimmedName) {
        const msg = 'Please enter your name.'
        setError(msg)
        throw new Error(msg)
      }
      if (trimmedPassword !== trimmedConfirm) {
        const msg = 'Password and confirm password do not match.'
        setError(msg)
        throw new Error(msg)
      }
      try {
        const response = await api.post('/api/auth/register', {
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          confirmPassword: trimmedConfirm,
        })
        const { token, refreshToken, user } = response.data || {}
        if (!user) {
          const msg = 'Unexpected server response. Please try again.'
          setError(msg)
          throw new Error(msg)
        }
        const mapped = persistSession({ token, refreshToken, user })
        setError('')
        return mapped
      } catch (err) {
        const msg = extractErrorMessage(err, 'Unable to register. Please try again later.')
        setError(msg)
        throw new Error(msg)
      }
    },
    [persistSession],
  )

  const completeOAuth = useCallback(
    async ({ token, refreshToken }) => {
      if (!token) throw new Error('Missing OAuth token')
      localStorage.setItem('accessToken', token)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
      const res = await api.get('/api/auth/me')
      const user = res.data?.user
      if (!user) throw new Error('Unable to load user profile')
      const mapped = mapUser(user)
      setCurrentUser(mapped)
      localStorage.setItem('currentUser', JSON.stringify(mapped))
      return mapped
    },
    [],
  )

  const logout = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (accessToken || refreshToken) {
        await api.post('/api/auth/logout', { refreshToken })
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('currentUser')
      setCurrentUser(null)
      setError('')
    }
  }, [])

  const createUser = useCallback(async ({ email, username, password, role }) => {
    try {
      const res = await api.post('/api/admin/users', {
        name: username,
        email,
        role,
        password,
      })
      const created = res.data?.user
      const generatedPassword = res.data?.generatedPassword
      if (created?.email) {
        await refreshAdminUsers()
      }
      return created
        ? {
            email: created.email,
            username: created.name,
            role: created.role,
            generatedPassword: generatedPassword || password,
          }
        : null
    } catch (e) {
      const msg = extractErrorMessage(e, 'Unable to create user.')
      return { error: msg }
    }
  }, [refreshAdminUsers])

  const updateAdminUser = useCallback(async (id, payload) => {
    const res = await api.patch(`/api/admin/users/${id}`, payload)
    await refreshAdminUsers()
    return res.data?.user || null
  }, [refreshAdminUsers])

  const changeAdminUserRole = useCallback(async (id, role) => {
    const res = await api.patch(`/api/admin/users/${id}/role`, { role })
    await refreshAdminUsers()
    return res.data?.user || null
  }, [refreshAdminUsers])

  const changeAdminUserStatus = useCallback(async (id, status) => {
    const res = await api.patch(`/api/admin/users/${id}/status`, { status })
    await refreshAdminUsers()
    return res.data?.user || null
  }, [refreshAdminUsers])

  const deleteAdminUser = useCallback(async (id) => {
    await api.delete(`/api/admin/users/${id}`)
    await refreshAdminUsers()
  }, [refreshAdminUsers])

  const clearError = useCallback(() => setError(''), [])

  const value = useMemo(
    () => ({
      currentUser,
      isRestoring,
      error,
      clearError,
      login,
      register,
      logout,
      completeOAuth,
      persistSession,
      // admin-only
      adminUsers,
      createUser,
      updateAdminUser,
      changeAdminUserRole,
      changeAdminUserStatus,
      deleteAdminUser,
      refreshAdminUsers,
      // security analytics (in-memory)
      loginAttempts,
      lockedEmails,
      deactivatedEmails,
      onToggleLock: handleToggleLock,
      onToggleDeactivate: handleToggleDeactivate,
    }),
    [
      currentUser,
      isRestoring,
      error,
      clearError,
      login,
      register,
      logout,
      completeOAuth,
      persistSession,
      adminUsers,
      createUser,
      updateAdminUser,
      changeAdminUserRole,
      changeAdminUserStatus,
      deleteAdminUser,
      refreshAdminUsers,
      loginAttempts,
      lockedEmails,
      deactivatedEmails,
      handleToggleLock,
      handleToggleDeactivate,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
