import { Navigate, useLocation } from 'react-router-dom'

import { roleHomePath, useAuth } from '@/context/AuthContext'

export function ProtectedRoute({ role, roles, children }) {
  const { currentUser, isRestoring } = useAuth()
  const location = useLocation()
  const allowedRoles = roles ?? (role ? [role] : null)

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-muted)] border-t-[var(--color-primary)]" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={roleHomePath(currentUser.role)} replace />
  }

  return children
}

export function PublicOnlyRoute({ children }) {
  const { currentUser, isRestoring } = useAuth()

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-muted)] border-t-[var(--color-primary)]" />
      </div>
    )
  }

  if (currentUser) {
    return <Navigate to={roleHomePath(currentUser.role)} replace />
  }

  return children
}
