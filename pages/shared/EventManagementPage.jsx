import { CalendarRange, FileDown, LineChart, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { api, extractErrorMessage } from '@/lib/api'

export function EventManagementPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [insight, setInsight] = useState(null)
  const [insightId, setInsightId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/events')
      if (res.data?.events) setEvents(res.data.events)
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load events.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const moveToRecycle = async (id) => {
    try {
      await api.delete(`/api/admin/events/${id}`)
      toast({ title: 'Moved to Recycle bin', description: 'You can restore it from the admin Recycle bin.', variant: 'success' })
      await load()
    } catch (err) {
      toast({ title: 'Failed', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  const showInsights = async (id) => {
    setInsightId(id)
    try {
      const res = await api.get(`/api/events/${id}/resource-insights`)
      setInsight(res.data)
    } catch (err) {
      toast({ title: 'Unable to load insights', description: extractErrorMessage(err), variant: 'destructive' })
      setInsight(null)
    }
  }

  const downloadStoryPdf = async (id) => {
    try {
      const res = await api.get(`/api/events/${id}/story-pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `event-story-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Download started', variant: 'success' })
    } catch (err) {
      toast({ title: 'PDF not available', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Events"
        title="Event management"
        description="View events, open the smart resource tracker, move items to the Recycle bin, or download a PDF story for completed events."
      />

      {error ? <p className="text-sm text-[var(--color-destructive)]">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading events…</p>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-6 w-6" />}
          title="No events found"
          description="Events will appear here once created."
        />
      ) : (
        <div className="grid gap-4">
          {events.map((event) => {
            const eid = String(event.id || event._id)
            return (
              <Card key={eid} glass className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{event.name || event.title}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {event.type || 'General'} • {event.location || event.place || 'TBD'}
                      {event.workflowStatus ? (
                        <span className="ml-2">
                          <Badge variant="outline" className="capitalize">{event.workflowStatus}</Badge>
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {event.status || 'unknown'}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`${eid}`}>View details</Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void showInsights(eid)}>
                      <LineChart className="h-4 w-4" />
                      Resources
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void downloadStoryPdf(eid)}>
                      <FileDown className="h-4 w-4" />
                      PDF story
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[var(--color-destructive)]"
                      onClick={() => void moveToRecycle(eid)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Recycle
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!insightId} onOpenChange={(open) => { if (!open) { setInsightId(null); setInsight(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Smart resource tracker</DialogTitle>
            <DialogDescription>
              {insight ? insight.name : 'Loading…'}
            </DialogDescription>
          </DialogHeader>
          {insight ? (
            <ul className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
              <li>Total seats: {insight.totalSeats}</li>
              <li>Registrations: {insight.registrations}</li>
              <li>Unused seats: {insight.unusedSeats}</li>
              <li>Utilization efficiency: {insight.utilizationEfficiencyPct}%</li>
              <li>Waste score (higher = more unused/no-shows): {insight.wasteScore}/100</li>
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
