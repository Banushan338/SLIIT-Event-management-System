import { useEffect, useState } from 'react'
import axios from 'axios'

import { Login } from './components/Login.jsx'
import { AdminDashboard } from './roles/Admin/AdminDashboard.jsx'
import { FacultyCoordinatorDashboard } from './roles/FacultyCoordinator/FacultyCoordinatorDashboard.jsx'
import { OrganizerDashboard } from './roles/Organizer/OrganizerDashboard.jsx'
import { StudentDashboard } from './roles/Student/StudentDashboard.jsx'

const MAX_FAILED_ATTEMPTS = 5
const ATTEMPT_WINDOW_MINUTES = 10

// Prefer Vite env, fall back to local dev URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Dummy failed login attempts so "Most failed login attempts" shows data (counts > 0)
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

const AppContent = () => {
  const [currentUser, setCurrentUser] = useState(null)
  const [error, setError] = useState('')

  const [adminUsers, setAdminUsers] = useState([])

  // Simple in-memory security analytics for admin (pre-seeded with dummy failed attempts)
  const [loginAttempts, setLoginAttempts] = useState(DUMMY_FAILED_ATTEMPTS)
  const [lockedEmails, setLockedEmails] = useState({})
  const [deactivatedEmails, setDeactivatedEmails] = useState({})

  // On first load, try to restore user from localStorage so refresh keeps user logged in.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser')
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (parsed && parsed.email && parsed.role && parsed.username) {
        setCurrentUser(parsed)
      } else {
        localStorage.removeItem('currentUser')
      }
    } catch {
      // If corrupted, clear it.
      localStorage.removeItem('currentUser')
    }
  }, [])

  // Admin: always use real backend users (seeded if DB is empty)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return

    axios
      .get(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        const items = res.data?.users ?? []
        setAdminUsers(
          items.map((u) => ({
            id: u.id,
            email: u.email,
            username: u.name,
            role: u.role,
          })),
        )
      })
      .catch(() => {
        // keep current state
      })
  }, [currentUser])

  const recordLoginAttempt = (email, success) => {
    const normalizedEmail = email.trim().toLowerCase()
    const timestamp = Date.now()

    setLoginAttempts((prev) => {
      const next = [...prev.slice(-199), { email: normalizedEmail, success, timestamp }]

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
  }

  const handleToggleLock = (email) => {
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
  }

  const handleToggleDeactivate = (email) => {
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
  }

  const handleLogin = async (email, password) => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    if (deactivatedEmails[trimmedEmail]) {
      setError(
        'Your account has been deactivated. Please contact the administrator.',
      )
      setCurrentUser(null)
      recordLoginAttempt(trimmedEmail, false)
      return
    }

    if (lockedEmails[trimmedEmail]) {
      setError(
        'Your account is temporarily locked due to too many failed login attempts.',
      )
      setCurrentUser(null)
      return
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: trimmedEmail,
          password: trimmedPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      // Backend returns: { message, user, token, refreshToken }
      const { token, refreshToken, user } = response.data || {}

      if (!user) {
        setError('Unexpected server response. Please try again.')
        setCurrentUser(null)
        recordLoginAttempt(trimmedEmail, false)
        return
      }

      if (token) {
        localStorage.setItem('accessToken', token)
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      }

      const mappedUser = {
        id: user.id,
        email: user.email,
        username: user.name,
        role: user.role,
      }

      recordLoginAttempt(trimmedEmail, true)
      setCurrentUser(mappedUser)
      try {
        localStorage.setItem('currentUser', JSON.stringify(mappedUser))
      } catch {
        // non-fatal
      }
      setError('')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      const responseMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'string' ? err.response.data : null)

      setError(
        responseMessage ||
          'Unable to connect to server. Please try again later.',
      )
      setCurrentUser(null)
      recordLoginAttempt(trimmedEmail, false)
    }
  }

  const handleLogout = async () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    try {
      if (accessToken || refreshToken) {
        await axios.post(
          `${API_BASE_URL}/api/auth/logout`,
          { refreshToken },
          {
            headers: {
              Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
              'Content-Type': 'application/json',
            },
          },
        )
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error during logout', err)
      // We still clear local state/tokens even if backend call fails
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('currentUser')
      setCurrentUser(null)
      setError('')
    }
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} error={error} />
  }

  const handleCreateUser = async ({ email, username, password, role }) => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      alert('You are not logged in.')
      return null
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/admin/users`,
        { name: username, email, role, password },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const created = res.data?.user
      const generatedPassword = res.data?.generatedPassword
      if (created?.email) {
        setAdminUsers((prev) => [
          {
            id: created.id,
            email: created.email,
            username: created.name,
            role: created.role,
          },
          ...prev,
        ])
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
      alert(e?.response?.data?.message || 'Unable to create user.')
      return null
    }
  }

  const securityProps = {
    loginAttempts,
    lockedEmails,
    deactivatedEmails,
    onToggleLock: handleToggleLock,
    onToggleDeactivate: handleToggleDeactivate,
  }

  const commonProps = {
    user: currentUser,
    onLogout: handleLogout,
    ...securityProps,
  }

  switch (currentUser.role) {
    case 'student':
      return <StudentDashboard {...commonProps} />
    case 'facultyCoordinator':
      return <FacultyCoordinatorDashboard {...commonProps} />
    case 'organizer':
      return <OrganizerDashboard {...commonProps} />
    case 'admin':
      return (
        <AdminDashboard
          {...commonProps}
          users={adminUsers}
          onCreateUser={handleCreateUser}
        />
      )
    default:
      return (
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-8">
          <div className="bg-white border border-black/5 rounded-3xl shadow-xl shadow-indigo-100 p-8 max-w-lg w-full text-center">
            <p className="text-slate-700">
              Signed in as <strong>{currentUser.username}</strong> with unknown
              role: <code className="text-slate-900">{currentUser.role}</code>
            </p>
            <button
              className="mt-6 inline-flex items-center justify-center bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      )
  }
}

export default function App() {
  return <AppContent />
}
