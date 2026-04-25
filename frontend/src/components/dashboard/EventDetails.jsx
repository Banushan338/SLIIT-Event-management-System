import { CalendarDays, Clock3, MapPin, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function formatDate(value) {
  if (!value) return 'TBD'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function EventDetails({ event, registered = false, canRegister = false, onRegister }) {
  return (
    <Card glass className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {event?.type || 'General'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{event?.name || event?.title || 'Untitled event'}</h1>
        </div>
        <Badge variant={registered ? 'success' : 'outline'} className="capitalize">
          {registered ? 'Registered' : event?.status || 'upcoming'}
        </Badge>
      </div>

      <p className="text-sm text-[var(--color-muted-foreground)]">
        {event?.description || 'No description available.'}
      </p>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(event?.startTime || event?.date)}</p>
        <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{event?.time || 'Time TBD'}</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event?.location || event?.place || 'Venue TBD'}</p>
        <p className="flex items-center gap-2"><Users className="h-4 w-4" />{event?.totalSeats || 0} seats</p>
      </div>

      {canRegister ? (
        <Button variant="gradient" onClick={onRegister} disabled={!onRegister}>
          Register now
        </Button>
      ) : null}
    </Card>
  )
}
