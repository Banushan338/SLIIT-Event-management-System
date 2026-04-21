import { Bell, CalendarDays, LayoutDashboard, Sparkles, Ticket, User } from 'lucide-react'
import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { RoleLayout } from '@/components/common/RoleLayout'
import { StudentDashboardPage } from '@/pages/student/StudentDashboardPage'
import { StudentBrowsePage } from '@/pages/student/StudentBrowsePage'
import { StudentTicketsPage } from '@/pages/student/StudentTicketsPage'
import { StudentFeedbackPage } from '@/pages/student/StudentFeedbackPage'
import { ProfilePage } from '@/pages/student/ProfilePage'
import { StudentEventDetailPage } from '@/pages/student/StudentEventDetailPage'
import { NotificationPreferencesPage } from '@/pages/shared/NotificationPreferencesPage'
import { useStudentEvents } from '@/hooks/useStudentEvents'
import { useNotifications } from '@/hooks/useNotifications'

const navItems = [
  {
    to: '/student',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    to: '/student/browse',
    label: 'Browse Events',
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    to: '/student/tickets',
    label: 'My Tickets',
    icon: <Ticket className="h-4 w-4" />,
  },
  {
    to: '/student/feedback',
    label: 'Past Feedback',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    to: '/student/profile',
    label: 'Profile',
    icon: <User className="h-4 w-4" />,
  },
  {
    to: '/student/notifications',
    label: 'Notifications',
    icon: <Bell className="h-4 w-4" />,
  },
]

function StudentLayout() {
  const data = useStudentEvents()
  const { notifications, markAllRead, markRead } = useNotifications()
  const [search, setSearch] = useState('')

  return (
    <RoleLayout
      navItems={navItems}
      notifications={notifications}
      onMarkAllRead={markAllRead}
      onOpenNotification={(n) => markRead(n?.id)}
      searchPlaceholder="Search events, tickets…"
      search={search}
      onSearchChange={setSearch}
      outletContext={{ ...data, search, setSearch }}
    />
  )
}

export function StudentRoutes() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<StudentDashboardPage />} />
        <Route path="browse" element={<StudentBrowsePage />} />
        <Route path="tickets" element={<StudentTicketsPage />} />
        <Route path="feedback" element={<StudentFeedbackPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationPreferencesPage />} />
        <Route path="event/:eventId" element={<StudentEventDetailPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  )
}
