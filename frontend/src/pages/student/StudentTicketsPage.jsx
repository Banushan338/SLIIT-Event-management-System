import { CalendarDays, Download, QrCode, Ticket, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function formatDate(value) {
  if (!value) return 'Date TBD'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function StudentTicketsPage() {
  const ctx = useOutletContext()
  const { events = [], registrations = {}, loading, deleteTicket } = ctx || {}
  const { currentUser } = useAuth()
  const [busyEventId, setBusyEventId] = useState('')
  const qrRefs = useRef({})

  const tickets = useMemo(
    () => events.filter((e) => Boolean(registrations[String(e.id)])),
    [events, registrations],
  )

  const onDeleteTicket = async (event) => {
    if (!deleteTicket) return
    const eventId = String(event.id)
    const ok = window.confirm(`Delete ticket for "${event.name || event.title}"?`)
    if (!ok) return
    setBusyEventId(eventId)
    const result = await deleteTicket(eventId)
    if (!result?.ok) {
      window.alert(result?.error || 'Unable to delete ticket.')
    }
    setBusyEventId('')
  }

  const onDownloadQr = (event) => {
    const eventId = String(event.id)
    const canvas = qrRefs.current[eventId]
    if (!canvas) return
    const pngUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    const safeName = String(event.name || event.title || 'ticket').replace(/[^a-z0-9]+/gi, '-')
    link.href = pngUrl
    link.download = `${safeName || 'event'}-qr.png`
    link.click()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My events"
        title="My Tickets"
        description="Events you have already registered for."
      />

      {loading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading tickets…</p>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-6 w-6" />}
          title="No tickets yet"
          description="Register for an event to get your ticket."
          action={
            <Button asChild variant="outline">
              <Link to="/student/browse">Browse events</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map((event) => (
            <Card key={String(event.id)} glass className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold leading-tight">{event.name || event.title}</h3>
                <Badge variant="success">Registered</Badge>
              </div>

              <div className="space-y-1 text-sm text-[var(--color-muted-foreground)]">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(event.startTime || event.date)}
                </p>
                <p>{event.location || event.place || 'Venue TBD'}</p>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-xs text-[var(--color-muted-foreground)]">
                <p className="flex items-center gap-2 font-medium text-[var(--color-foreground)]">
                  <QrCode className="h-4 w-4" />
                  Entry QR
                </p>
                <div className="mt-3 flex justify-center rounded-lg bg-white p-2">
                  <QRCodeCanvas
                    value={JSON.stringify({
                      eventId: String(event.id),
                      eventName: event.name || event.title,
                      studentEmail: currentUser?.email || '',
                    })}
                    size={132}
                    includeMargin
                    ref={(node) => {
                      if (node) qrRefs.current[String(event.id)] = node
                    }}
                  />
                </div>
                <p className="mt-2 text-center">QR includes your email for organizer check-in.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onDownloadQr(event)}>
                    <Download className="mr-1 h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busyEventId === String(event.id)}
                    onClick={() => onDeleteTicket(event)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete Ticket
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
