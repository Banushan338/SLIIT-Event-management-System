import { Navigate, Route, Routes } from 'react-router-dom'

import { PublicOnlyRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage'
import { StudentRoutes } from '@/pages/student/routes'
import { OrganizerRoutes } from '@/pages/organizer/routes'
import { FacultyRoutes } from '@/pages/faculty/routes'
import { AdminRoutes } from '@/pages/admin/routes'
import { roleHomePath } from '@/context/AuthContext'
import { useAuth } from '@/context/AuthContext'

function RootRedirect() {
  const { currentUser, isRestoring } = useAuth()
  if (isRestoring) return null
  if (!currentUser) return <Navigate to="/login" replace />
  return <Navigate to={roleHomePath(currentUser.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <PublicOnlyRoute>
            <ResetPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      <Route
        path="/student/*"
        element={
          <ProtectedRoute roles={['student', 'staff']}>
            <StudentRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/*"
        element={
          <ProtectedRoute role="organizer">
            <OrganizerRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/*"
        element={
          <ProtectedRoute role="facultyCoordinator">
            <FacultyRoutes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminRoutes />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
