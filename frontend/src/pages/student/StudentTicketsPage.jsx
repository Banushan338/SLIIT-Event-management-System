import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import {
  Calendar,
  Clock,
  Download,
  MapPin,
  Share2,
  Ticket as TicketIcon,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useRef } from 'react'
import { useOutletContext, Link, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { SkeletonCard } from '@/components/common/SkeletonCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { CATEGORY_META } from '@/components/common/EventCard'

function formatTicketDate(input) {
  if (!input) return 'TBA'
  const d = new Date(input)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function buildRawQr(eventId, user, reg) {
  const payload = {
    v: 1,
    e: eventId,
    u: user?.id || user?.email,
    t: reg?.ticketCode || reg?.registeredAt || Date.now(),
  }
  return JSON.stringify(payload)
}

export function StudentTicketsPage() {
  const { currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  const ctx = useOutletContext()
  const { events = [], registrations = {}, loading } = ctx || {}
  const newlyRegisteredId = searchParams.get('registered')

  const tickets = useMemo(() => {
    return events
      .filter((e) => registrations[String(e.id)])
      .map((e) => ({ event: e, reg: registrations[String(e.id)] }))
      .sort((a, b) => new Date(a.event.date || 0) - new Date(b.event.date || 0))
  }, [events, registrations])

  const newEvent = useMemo(
    () => tickets.find((t) => String(t.event.id) === String(newlyRegisteredId))?.event || null,
    [tickets, newlyRegisteredId],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your passes"
        title="My Tickets"
        description="QR-ready tickets for every event you've registered for. Show them at the entrance to check in."
      />
      {newlyRegisteredId && (
        <Alert>
          <AlertDescription>
            {newEvent
              ? `Registration successful for "${newEvent.name}". You now have ${tickets.length} registered event(s).`
              : `Registration successful. You now have ${tickets.length} registered event(s).`}{' '}
            Your latest ticket is listed below.
          </AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<TicketIcon className="h-6 w-6" />}
          title="No tickets yet"
          description="Register for events from the catalog and your tickets will appear here."
          action={
            <Button asChild variant="gradient">
              <Link to="/student/browse">Browse events</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map(({ event, reg }, ti) => (
            <TicketCard
              key={event.id != null ? String(event.id) : `t-${ti}`}
              event={event}
              reg={reg}
              user={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TicketCard({ event, reg, user }) {
  const ref = useRef(null)
  const meta =
    CATEGORY_META[(event.type || 'academic').toLowerCase()] || CATEGORY_META.academic
  const rawQr = useMemo(
    () => buildRawQr(event.id, user, reg),
    [event.id, user, reg],
  )

  const handleSavePdf = async () => {
    if (!ref.current) return
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        backgroundColor: '#0B1120',
      })
      const pdf = new jsPDF({ unit: 'px', format: 'a4' })
      const img = new Image()
      img.src = dataUrl
      await new Promise((r) => (img.onload = r))
      const pageW = pdf.internal.pageSize.getWidth()
      const w = pageW - 64
      const h = (img.height / img.width) * w
      pdf.addImage(dataUrl, 'PNG', 32, 32, w, h)
      pdf.save(`${event.name || 'ticket'}-ticket.pdf`)
      toast({
        title: 'Ticket saved',
        description: 'Your PDF was downloaded successfully.',
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Could not save PDF',
        description: 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleShare = async () => {
    const text = `I'm attending ${event.name} on ${formatTicketDate(event.date)} at ${event.place || 'campus'}.`
    try {
      if (navigator.share) {
        await navigator.share({ title: event.name, text })
      } else {
        await navigator.clipboard.writeText(text)
        toast({
          title: 'Copied to clipboard',
          description: 'Event details are ready to paste.',
          variant: 'success',
        })
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Card glass className="overflow-hidden">
      <div
        ref={ref}
        className="relative bg-[var(--color-card)] p-5"
        style={{ colorScheme: 'dark' }}
      >
        <div
          className="absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl opacity-50"
          style={{ background: `linear-gradient(135deg, ${meta.badgeClass.match(/-([a-z]+)-/)?.[1] || 'indigo'}, transparent)` }}
          aria-hidden
        />
        <div className="relative flex items-start justify-between">
          <div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
            <h3 className="mt-3 text-lg font-bold leading-tight">
              {event.name}
            </h3>
          </div>
          <div className="rounded-xl bg-white p-2 shadow-lg">
            <QRCodeSVG
              value={rawQr}
              size={96}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        <div className="relative mt-4 space-y-1.5 text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
            <span>{formatTicketDate(event.date)}</span>
            {event.time && (
              <>
                <span className="text-[var(--color-border)]">•</span>
                <Clock className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
                <span>{event.time}</span>
              </>
            )}
          </div>
          {event.place && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
              <span className="truncate">{event.place}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <TicketIcon className="h-3.5 w-3.5 text-[var(--color-brand-cyan)]" />
            <span className="font-mono">
              {reg?.ticketCode
                ? reg.ticketCode.slice(0, 12)
                : `TCKT-${String(event.id).slice(-6).toUpperCase()}`}
            </span>
          </div>
        </div>

        <div className="relative mt-4 border-t border-dashed border-[var(--color-border)] pt-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Attendee
          </p>
          <p className="text-sm font-semibold">{user?.username}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">{user?.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--color-border)] p-4">
        <Button variant="outline" size="sm" onClick={handleSavePdf} className="flex-1">
          <Download className="h-3.5 w-3.5" />
          Save PDF
        </Button>
        <Button variant="gradient" size="sm" onClick={handleShare} className="flex-1">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>
    </Card>
  )
}
