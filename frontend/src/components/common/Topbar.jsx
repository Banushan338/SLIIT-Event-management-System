import { KeyRound, LogOut, Menu, Search, User as UserIcon } from 'lucide-react'
import { useState } from 'react'

import { MobileSidebar } from '@/components/common/Sidebar'
import { NotificationsPopover } from '@/components/common/NotificationsPopover'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Logo } from '@/components/common/Logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { resolveMediaUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U'
  )
}

export function Topbar({
  user,
  search,
  onSearchChange,
  searchPlaceholder = 'Search events, tickets, people...',
  notifications = [],
  onMarkAllRead,
  onOpenNotification,
  onProfile,
  onChangePassword,
  onLogout,
  navItems,
  primaryCta,
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const avatarSrc = resolveMediaUrl(user?.profileImage)

  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--color-background)_75%,transparent)] backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-full border border-[var(--color-border)]"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-4">
            <MobileSidebar
              navItems={navItems}
              primaryCta={primaryCta}
              onItemClick={() => setMobileOpen(false)}
              onLogout={onLogout}
            />
          </SheetContent>
        </Sheet>

        <div className="lg:hidden">
          <Logo collapsed />
        </div>

        <div className="relative flex-1 max-w-xl hidden sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-10"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <NotificationsPopover
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onOpenNotification={onOpenNotification}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-[var(--color-muted)]',
                  'border border-[var(--color-border)]',
                )}
              >
                <Avatar className="h-8 w-8 border border-[var(--color-border)]/80">
                  {avatarSrc ? (
                    <AvatarImage
                      key={avatarSrc}
                      src={avatarSrc}
                      alt=""
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="text-xs">{initials(user?.username)}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold max-w-[120px] truncate">
                    {user?.username || 'User'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    {user?.role?.replace(/([A-Z])/g, ' $1').trim() || ''}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[60]">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--color-foreground)] normal-case tracking-normal">
                  {user?.username}
                </span>
                <span className="text-[11px] font-normal text-[var(--color-muted-foreground)] normal-case tracking-normal">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onProfile ? (
                <DropdownMenuItem onSelect={() => onProfile()}>
                  <UserIcon className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => onChangePassword?.()}>
                <KeyRound className="h-4 w-4" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onLogout?.()}
                className="text-[var(--color-destructive)] focus:text-[var(--color-destructive)]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
