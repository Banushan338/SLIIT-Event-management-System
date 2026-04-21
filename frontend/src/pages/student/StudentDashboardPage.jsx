import {
  CalendarCheck2,
  CalendarClock,
  Ticket,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { SkeletonCard, SkeletonStat } from '@/components/common/SkeletonCard'
import { StatCard } from '@/components/common/StatCard'
import { EventCard } from '@/components/common/EventCard'
import { Button } from '@/components/ui/button'

export function StudentDashboardPage() {
  const ctx = useOutletContext()
  const {
    events = [],
    registrations = {},
    loading,
  } = ctx || {}

  const {
    registeredUpcoming,
    attended,
    thisWeek,
    registeredUpcomingEvents,
  } = useMemo(() => {
    const regIds = Object.keys(registrations)
    const registeredUpcomingEvents = events
      .filter((e) => regIds.includes(String(e.id)))
      .filter((e) => e.status === 'upcoming')
      .sort((a, b) => new Date(a.startTime || a.date) - new Date(b.startTime || b.date))
    const attendedEvents = events.filter((e) => registrations[String(e.id)]?.attended)
    const weekEvents = events
      .filter((e) => {
        const d = new Date(e.startTime || e.date)
        if (Number.isNaN(d.getTime())) return false
        const now = new Date()
        const end = new Date()
        end.setDate(now.getDate() + 7)
        return d >= now && d <= end
      })
      .sort((a, b) => new Date(a.startTime || a.date) - new Date(b.startTime || b.date))

    return {
      registeredUpcoming: registeredUpcomingEvents.length,
      attended: attendedEvents.length,
      thisWeek: weekEvents.length,
      registeredUpcomingEvents,
    }
  }, [events, registrations])

  const latestRegistered = useMemo(
    () => registeredUpcomingEvents.slice(0, 3),
    [registeredUpcomingEvents],
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          <>
            <StatCard
              label="Registered (upcoming)"
              value={registeredUpcoming}
              icon={<Ticket className="h-5 w-5" />}
              accent="indigo"
              hint="Events you've secured a seat for"
              delay={0}
            />
            <StatCard
              label="Attended"
              value={attended}
              icon={<CalendarCheck2 className="h-5 w-5" />}
              accent="teal"
              hint="Events you checked in to"
              delay={0.05}
            />
            <StatCard
              label="This week"
              value={thisWeek}
              icon={<CalendarClock className="h-5 w-5" />}
              accent="cyan"
              hint="Happening in the next 7 days"
              delay={0.1}
            />
          </>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My upcoming registrations</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/student/browse">Browse events</Link>
          </Button>
        </div>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : latestRegistered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {latestRegistered.map((e, i) => (
              <EventCard
                key={String(e.id)}
                event={{
                  ...e,
                  name: e.title || e.name,
                  date: e.startTime || e.date,
                  place: e.location || e.place,
                }}
                registered
                animationDelay={Math.min(i * 0.04, 0.2)}
                onView={() => {}}
                actions={
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/student/browse">Browse More</Link>
                  </Button>
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] p-6 text-sm text-[var(--color-muted-foreground)]">
            No registered upcoming events yet.
          </div>
        )}
      </section>
    </div>
  )
}
