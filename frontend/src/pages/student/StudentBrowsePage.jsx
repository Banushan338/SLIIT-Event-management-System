import {
  Book,
  CalendarSearch,
  GraduationCap,
  PartyPopper,
  Trophy,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

import { EventHorizontalCard } from '@/components/dashboard/EventHorizontalCard'
import { EmptyState } from '@/components/common/EmptyState'
import { FilterChips } from '@/components/common/FilterChips'
import { PageHeader } from '@/components/common/PageHeader'
import { SkeletonCard } from '@/components/common/SkeletonCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const CATEGORIES = [
  { value: 'all', label: 'All', icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { value: 'academic', label: 'Academic', icon: <Book className="h-3.5 w-3.5" /> },
  { value: 'work', label: 'Workshop', icon: <Wrench className="h-3.5 w-3.5" /> },
  { value: 'sports', label: 'Sports', icon: <Trophy className="h-3.5 w-3.5" /> },
  { value: 'social', label: 'Social', icon: <PartyPopper className="h-3.5 w-3.5" /> },
]

function toRelative(startTime, fallbackDate) {
  const target = new Date(startTime || fallbackDate).getTime()
  if (Number.isNaN(target)) return 'TBA'
  const diff = target - Date.now()
  if (diff <= 0) return 'Started'
  const mins = Math.floor(diff / 60000)
  const days = Math.floor(mins / (24 * 60))
  const hours = Math.floor((mins % (24 * 60)) / 60)
  if (days > 0) return `Starts in ${days}d ${hours}h`
  return `Starts in ${hours}h ${mins % 60}m`
}

function isCompletedEvent(event) {
  const status = String(event?.status || '').toLowerCase()
  if (status === 'completed') return true
  const end = new Date(event?.endTime || event?.date).getTime()
  if (Number.isNaN(end)) return false
  return end < Date.now()
}

export function StudentBrowsePage() {
  const navigate = useNavigate()
  const ctx = useOutletContext()
  const {
    events = [],
    registrations = {},
    loading,
    refresh,
    search = '',
  } = ctx || {}
  const [category, setCategory] = useState('all')

  const counts = useMemo(() => {
    const visibleEvents = events.filter((e) => {
      const registered = Boolean(registrations[String(e.id)])
      return !isCompletedEvent(e) || registered
    })
    const map = { all: visibleEvents.length }
    for (const c of CATEGORIES) {
      if (c.value === 'all') continue
      map[c.value] = visibleEvents.filter(
        (e) => (e.type || '').toLowerCase() === c.value,
      ).length
    }
    return map
  }, [events, registrations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((e) => {
      const registered = Boolean(registrations[String(e.id)])
      if (isCompletedEvent(e) && !registered) return false
      if (category !== 'all' && (e.type || '').toLowerCase() !== category)
        return false
      if (!q) return true
      return (
        (e.name || '').toLowerCase().includes(q) ||
        (e.place || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      )
    })
  }, [events, category, search, registrations])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Browse Events"
        description="Explore every upcoming event on campus — academic, workshops, sports and socials."
        actions={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <CalendarSearch className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <FilterChips
        options={CATEGORIES.map((c) => ({ ...c, count: counts[c.value] ?? 0, groupId: 'browse' }))}
        value={category}
        onChange={setCategory}
      />

      <Alert>
        <AlertDescription>
          Open <strong>View Details</strong> to register for an event and see full event information before confirming.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarSearch className="h-6 w-6" />}
          title="No events match your filters"
          description="Try switching category or clearing the search bar above."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((event, i) => {
            return (
              <div key={event.id != null ? String(event.id) : `event-${i}`} className="space-y-2">
                <EventHorizontalCard
                  event={{
                    ...event,
                    title: event.title || event.name,
                    location: event.location || event.place,
                    startTime: event.startTime || event.date,
                  }}
                  countdown={toRelative(event.startTime, event.date)}
                  onViewDetails={() => navigate(`/student/event/${event.id}`)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
