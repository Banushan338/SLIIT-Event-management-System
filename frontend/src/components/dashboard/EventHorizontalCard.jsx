import { CalendarDays, Clock3, MapPin, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function statusClass(status) {
  if (status === 'upcoming') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (status === 'completed') return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  if (status === 'cancelled') return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
  if (status === 'ongoing') return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
  return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
}

export function EventHorizontalCard({ event, countdown, onViewDetails, actions }) {
  const date = event?.startTime ? new Date(event.startTime) : null
  const month = date ? date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase() : 'TBA'
  const day = date ? date.getDate() : '--'
  const year = date ? date.getFullYear() : ''

  return (
    <article
      className={cn(
        'group grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/70 p-4 shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg',
      )}
    >
      <div className="grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-center">
        <div className="relative h-[110px] overflow-hidden rounded-xl">
          <img
            src={event?.thumbnailUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop'}
            alt={event?.title || 'Event'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-center text-[10px] font-semibold text-white">
            <p>{month}</p>
            <p className="text-sm">{day}</p>
            <p>{year}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold">{event?.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{event?.description}</p>
          <div className="mt-2 grid gap-1 text-xs text-[var(--color-muted-foreground)] sm:grid-cols-2">
            <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{date ? date.toLocaleDateString() : 'TBA'}</p>
            <p className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}</p>
            <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event?.location || 'TBA'}</p>
            <p className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{event?.organizer?.name || 'Organizer'}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold capitalize', statusClass(event?.status))}>
            {event?.status}
          </span>
          <p className="text-xs text-[var(--color-muted-foreground)]">{countdown}</p>
          <Button size="sm" onClick={onViewDetails}>View Details</Button>
          {actions}
        </div>
      </div>
    </article>
  )
}
