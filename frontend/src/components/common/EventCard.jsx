import { motion } from 'framer-motion'
import {
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const CATEGORY_META = {
  academic: {
    label: 'Academic',
    badgeClass: 'bg-indigo-500/90 text-white border-indigo-400',
    gradient: 'from-indigo-500/70 to-transparent',
    fallback:
      'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1600&auto=format&fit=crop',
  },
  work: {
    label: 'Workshop',
    badgeClass: 'bg-cyan-500/90 text-white border-cyan-400',
    gradient: 'from-cyan-500/70 to-transparent',
    fallback:
      'https://images.unsplash.com/photo-1515169067868-5387ec356754?q=80&w=1600&auto=format&fit=crop',
  },
  workshop: {
    label: 'Workshop',
    badgeClass: 'bg-cyan-500/90 text-white border-cyan-400',
    gradient: 'from-cyan-500/70 to-transparent',
    fallback:
      'https://images.unsplash.com/photo-1515169067868-5387ec356754?q=80&w=1600&auto=format&fit=crop',
  },
  sports: {
    label: 'Sports',
    badgeClass: 'bg-emerald-500/90 text-white border-emerald-400',
    gradient: 'from-emerald-500/70 to-transparent',
    fallback:
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1600&auto=format&fit=crop',
  },
  social: {
    label: 'Social',
    badgeClass: 'bg-rose-500/90 text-white border-rose-400',
    gradient: 'from-rose-500/70 to-transparent',
    fallback:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop',
  },
}

function formatDate(input) {
  if (!input) return 'TBA'
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return String(input)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function EventCard({
  event,
  registered = false,
  full = false,
  capacityLabel,
  status,
  onRegister,
  onView,
  actions,
  className,
  animationDelay = 0,
}) {
  const meta = useMemo(() => {
    const type = (event?.type || 'academic').toLowerCase()
    return CATEGORY_META[type] || CATEGORY_META.academic
  }, [event?.type])

  const imgSrc = event?.thumbnailUrl || meta.fallback
  const dateStr = formatDate(event?.date)
  const capacity =
    capacityLabel ??
    (typeof event?.totalSeats === 'number'
      ? `${event?.registeredCount ?? event?.registered ?? 0}/${event.totalSeats} seats`
      : null)

  const statusTone =
    status === 'pending'
      ? 'warning'
      : status === 'rejected'
        ? 'destructive'
        : status === 'completed'
          ? 'info'
          : status === 'approved'
            ? 'success'
            : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: animationDelay }}
      whileHover={{ y: -6 }}
      className="h-full"
    >
      <Card
        glass
        className={cn(
          'group relative flex h-full flex-col overflow-hidden border border-[var(--color-border)] transition-shadow duration-300',
          'hover:shadow-glow',
          className,
        )}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img
            src={imgSrc}
            alt={event?.name || 'Event'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = meta.fallback
            }}
          />
          <div
            className={cn(
              'pointer-events-none absolute inset-0 bg-gradient-to-t',
              meta.gradient,
            )}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-card)] via-[var(--color-card)]/10 to-transparent opacity-80" />

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm',
                meta.badgeClass,
              )}
            >
              <Sparkles className="h-3 w-3" />
              {meta.label}
            </span>
            {statusTone && (
              <Badge variant={statusTone} className="uppercase tracking-wider text-[10px]">
                {status}
              </Badge>
            )}
          </div>

          {registered && (
            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
              <CheckCircle2 className="h-3 w-3" />
              Registered
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight">
            {event?.name || 'Untitled event'}
          </h3>
          {event?.description && (
            <p className="line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
              {event.description}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
              <span className="truncate">{dateStr}</span>
              {event?.time && (
                <>
                  <span className="text-[var(--color-border)]">•</span>
                  <Clock className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
                  <span>{event.time}</span>
                </>
              )}
            </div>
            {event?.place && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
                <span className="truncate">{event.place}</span>
              </div>
            )}
            {capacity && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
                <span>{capacity}</span>
              </div>
            )}
          </div>

          {actions ? (
            <div className="pt-1">{actions}</div>
          ) : (
            <div className="flex gap-2 pt-1">
              {onView && (
                <Button variant="outline" size="sm" onClick={onView} className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Details
                </Button>
              )}
              {onRegister && (
                <Button
                  variant={registered ? 'outline' : 'gradient'}
                  size="sm"
                  onClick={onRegister}
                  disabled={registered || full}
                  className="flex-1"
                >
                  {registered ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Registered
                    </>
                  ) : full ? (
                    'Full'
                  ) : (
                    <>
                      <CalendarCheck2 className="h-3.5 w-3.5" /> Register
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
