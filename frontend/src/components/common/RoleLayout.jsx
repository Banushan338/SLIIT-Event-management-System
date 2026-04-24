import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { Sidebar } from '@/components/common/Sidebar'
import { Topbar } from '@/components/common/Topbar'
import { useAuth, roleProfilePath } from '@/context/AuthContext'
import { toast } from '@/hooks/use-toast'

const COLLAPSED_KEY = 'sliit-sidebar-collapsed'

export function RoleLayout({
  navItems = [],
  primaryCta,
  notifications = [],
  searchPlaceholder,
  search,
  onSearchChange,
  onMarkAllRead,
  onOpenNotification,
  outletContext,
}) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [changePwdOpen, setChangePwdOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const handleLogout = async () => {
    await logout()
    toast({
      title: 'Signed out',
      description: 'You have been logged out. See you next time.',
      variant: 'success',
    })
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-background)] text-[var(--color-foreground)]">
      <Sidebar
        navItems={navItems}
        primaryCta={primaryCta}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          user={currentUser}
          navItems={navItems}
          primaryCta={primaryCta}
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onOpenNotification={onOpenNotification}
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          onProfile={() => navigate(roleProfilePath(currentUser?.role))}
          onChangePassword={() => setChangePwdOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet context={outletContext} />
        </main>
      </div>

      {changePwdOpen && (
        <ChangePasswordModal onClose={() => setChangePwdOpen(false)} />
      )}
    </div>
  )
}
