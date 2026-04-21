import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Sidebar({
  navItems = [],
  primaryCta,
  collapsed,
  onToggleCollapse,
  onLogout,
  footer,
}) {
  return (
    <aside
      className={cn(
        'relative z-30 hidden lg:flex h-screen sticky top-0 flex-col overflow-visible glass border-r border-[var(--color-border)] transition-[width] duration-300',
        collapsed ? 'w-[88px]' : 'w-[272px]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-5 pt-6 pb-4',
          collapsed && 'px-4 justify-center',
        )}
      >
        <Logo collapsed={collapsed} />
      </div>

      {primaryCta && !collapsed && (
        <div className="px-4 pb-4">
          <Button
            variant="gradient"
            size="lg"
            className="w-full rounded-2xl"
            onClick={primaryCta.onClick}
          >
            {primaryCta.icon}
            {primaryCta.label}
          </Button>
        </div>
      )}
      {primaryCta && collapsed && (
        <div className="px-2 pb-4">
          <Button
            variant="gradient"
            size="icon"
            className="w-full rounded-2xl"
            onClick={primaryCta.onClick}
            aria-label={primaryCta.label}
          >
            {primaryCta.icon}
          </Button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 pt-2 no-scrollbar">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? item.to.split('/').length <= 2}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                    isActive &&
                      'bg-brand-gradient-soft text-[var(--color-foreground)] shadow-sm',
                    collapsed && 'justify-center px-0',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="side-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand-gradient"
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                      />
                    )}
                    <span
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-brand-gradient text-white shadow-sm'
                          : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]',
                      )}
                    >
                      {item.icon}
                    </span>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                          className="flex-1 truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && item.badge && (
                      <span className="ml-auto rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[var(--color-border)] px-3 py-3">
        {footer}
        {onLogout && (
          <button
            onClick={onLogout}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-muted)] group-hover:bg-[var(--color-destructive)]/15">
              <LogOut className="h-4 w-4" />
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>

      <button
        onClick={onToggleCollapse}
        className="absolute -right-4 top-8 z-50 grid h-8 w-8 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] shadow-md transition-colors hover:bg-[var(--color-muted)]"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft
          className={cn(
            'h-3 w-3 transition-transform',
            collapsed && 'rotate-180',
          )}
        />
      </button>
    </aside>
  )
}

export function MobileSidebar({ navItems = [], primaryCta, onItemClick, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-1 pb-4">
        <Logo />
      </div>
      {primaryCta && (
        <Button
          variant="gradient"
          size="lg"
          className="mb-4 w-full rounded-2xl"
          onClick={() => {
            onItemClick?.()
            primaryCta.onClick?.()
          }}
        >
          {primaryCta.icon}
          {primaryCta.label}
        </Button>
      )}
      <nav className="flex-1 overflow-y-auto no-scrollbar">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? item.to.split('/').length <= 2}
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                    isActive &&
                      'bg-brand-gradient-soft text-[var(--color-foreground)]',
                  )
                }
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-muted)]">
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-[var(--color-border)] pt-3">
        <button
          onClick={() => {
            onItemClick?.()
            onLogout?.()
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-destructive)]/10">
            <LogOut className="h-4 w-4" />
          </span>
          Logout
        </button>
      </div>
    </div>
  )
}
