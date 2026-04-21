import { motion } from 'framer-motion'
import { Bell, CheckCircle2, Clock, Info } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const TYPE_ICONS = {
  success: CheckCircle2,
  info: Info,
  reminder: Clock,
}

const TYPE_COLORS = {
  success: 'text-emerald-400 bg-emerald-500/15',
  info: 'text-[var(--color-brand-cyan)] bg-[var(--color-brand-cyan)]/15',
  reminder: 'text-amber-400 bg-amber-500/15',
  default: 'text-[var(--color-primary)] bg-[var(--color-primary)]/15',
}

export function NotificationsPopover({ notifications = [], onMarkAllRead, onOpenNotification }) {
  const unread = notifications.filter((n) => !n.read).length
  const [selected, setSelected] = useState(null)

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-[var(--color-border)]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-gradient px-1 text-[10px] font-bold text-white"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-[60] w-[360px] border border-[var(--color-border)] p-0 shadow-2xl light:!bg-white/98 light:backdrop-blur-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-muted)]">
                <Bell className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                We'll let you know when something happens.
              </p>
            </div>
          ) : (
            <ul className="p-2">
              {notifications.map((n, i) => {
                const Icon = TYPE_ICONS[n.type] || Info
                return (
                  <li key={n.id ?? i}>
                    <button
                      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-[var(--color-muted)]"
                      onClick={() => {
                        setSelected(n)
                        onOpenNotification?.(n)
                      }}
                    >
                      <span
                        className={cn(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                          TYPE_COLORS[n.type] || TYPE_COLORS.default,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)] line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        {n.time && (
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                            {n.time}
                          </p>
                        )}
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-brand-gradient" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
        </PopoverContent>
      </Popover>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title || 'Notification'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm whitespace-pre-line">{selected?.fullMessage || selected?.message}</p>
          {selected?.time ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">{selected.time}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
