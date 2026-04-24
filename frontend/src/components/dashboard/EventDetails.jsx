import { CalendarDays, CheckCircle2, Clock3, Sparkles, MapPin, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function badgeVariant(status) {
  if (status === 'upcoming') return 'success'
  if (status === 'cancelled') return 'destructive'
  if (status === 'completed') return 'outline'
  return 'info'
}

export function EventDetails({ event, registered, canRegister = true, onRegister }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/70">
      <div className="relative h-56 w-full">
        <img
          src={event?.thumbnailUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1400&auto=format&fit=crop'}
          alt={event?.title || 'Event'}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-bold text-white">{event?.title}</p>
            <p className="text-sm text-white/80">{event?.description}</p>
          </div>
          <Badge variant={badgeVariant(event?.status)} className="capitalize">{event?.status}</Badge>
        </div>
      </div>

      <div className="grid gap-2 p-5 text-sm text-[var(--color-muted-foreground)] md:grid-cols-2">
        <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{new Date(event?.startTime).toLocaleDateString()}</p>
        <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{new Date(event?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event?.location || 'TBA'}</p>
        <p className="flex items-center gap-2"><UserRound className="h-4 w-4" />{event?.organizer?.name || 'Organizer'}</p>
      </div>

      <div className="px-5 pb-5">
        {registered ? (
          <Badge variant="success" className="inline-flex items-center gap-1.5 px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Registered
          </Badge>
        ) : canRegister ? (
          <Button
            onClick={onRegister}
            size="lg"
            className="rounded-xl border border-emerald-300/40 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
          >
            <Sparkles className="h-4 w-4" />
            Register Now
          </Button>
        ) : null}
      </div>
    </section>
  )
}
