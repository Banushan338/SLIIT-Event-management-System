import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { EventDetails } from '@/components/dashboard/EventDetails'
import { Button } from '@/components/ui/button'
import { api, extractErrorMessage } from '@/lib/api'

export function EventDetailsPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/api/events/${eventId}`)
        if (!ignore) setEvent(res.data?.event || null)
      } catch (err) {
        if (!ignore) setError(extractErrorMessage(err, 'Unable to load event details.'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (eventId) load()
    return () => {
      ignore = true
    }
  }, [eventId])

  if (loading) return <p className="text-sm text-[var(--color-muted-foreground)]">Loading event…</p>

  if (!event) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-destructive)]">{error || 'Event not found.'}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="..">Back to events</Link>
        </Button>
      </div>
    )
  }

  return <EventDetails event={event} />
}
