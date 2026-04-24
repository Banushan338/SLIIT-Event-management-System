import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Search,
  User,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { DataToolbar } from '@/components/common/DataToolbar'
import { EmptyState } from '@/components/common/EmptyState'
import { EventCard } from '@/components/common/EventCard'
import { PageHeader } from '@/components/common/PageHeader'
import { RoleLayout } from '@/components/common/RoleLayout'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { useNotifications } from '@/hooks/useNotifications'
import { ProfilePage } from '@/pages/student/ProfilePage'
import { NotificationPreferencesPage } from '@/pages/shared/NotificationPreferencesPage'
import { EventManagementPage } from '@/pages/shared/EventManagementPage'
import { EventDetailsPage } from '@/pages/shared/EventDetailsPage'

const navItems = [
  { to: '/faculty', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: '/faculty/approvals', label: 'Event Approvals', icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: '/faculty/events', label: 'Event Tab', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/faculty/browse', label: 'Browse Events', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/faculty/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { to: '/faculty/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
]

function formatDate(value) {
  if (!value) return 'TBD'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function sortCompletedLast(list = []) {
  return [...list].sort((a, b) => {
    const aCompleted = String(a?.status || '').toLowerCase() === 'completed'
    const bCompleted = String(b?.status || '').toLowerCase() === 'completed'
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1
    const aTime = new Date(a?.date || a?.startTime || 0).getTime()
    const bTime = new Date(b?.date || b?.startTime || 0).getTime()
    return aTime - bTime
  })
}

function useFacultyData() {
  const [overview, setOverview] = useState({ stats: null, trends: [] })
  const [pending, setPending] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [approvedList, setApprovedList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const [ov, pend, all, appr] = await Promise.allSettled([
          api.get('/api/faculty/overview'),
          api.get('/api/events/pending'),
          api.get('/api/events/faculty/all'),
          api.get('/api/events/approved'),
        ])
        if (ignore) return
        if (ov.status === 'fulfilled' && ov.value.data) {
          setOverview({
            stats: ov.value.data.stats,
            trends: ov.value.data.trends || [],
          })
        }
        if (pend.status === 'fulfilled' && pend.value.data?.events) setPending(pend.value.data.events)
        if (all.status === 'fulfilled' && all.value.data?.events) setAllEvents(all.value.data.events)
        if (appr.status === 'fulfilled' && appr.value.data?.events) setApprovedList(appr.value.data.events)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const approveEvent = (id) => api.post(`/api/events/${id}/approve`, {})
  const rejectEvent = (id, rejectionReason) =>
    api.post(`/api/events/${id}/reject`, { rejectionReason })

  return {
    overview,
    pending,
    allEvents,
    approvedList,
    loading,
    approveEvent,
    rejectEvent,
  }
}

function FacultyDashboardPage() {
  const { overview, loading } = useOutletContext()
  const stats = overview.stats || {
    totalEvents: 0,
    pendingApprovals: 0,
    approvedEvents: 0,
    rejectedEvents: 0,
    completedEvents: 0,
  }
  const trends = overview.trends?.length
    ? overview.trends
    : [
        { name: 'Jan', value: 0 },
        { name: 'Feb', value: 0 },
      ]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Faculty" title="Coordinator dashboard" description="Campus-wide event health at a glance." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total events" value={stats.totalEvents} accent="indigo" />
        <StatCard label="Pending" value={stats.pendingApprovals} accent="amber" />
        <StatCard label="Approved" value={stats.approvedEvents} accent="teal" />
        <StatCard label="Completed" value={stats.completedEvents} accent="cyan" />
      </div>
      <Card glass>
        <CardHeader>
          <CardTitle>Events created (6 months)</CardTitle>
          <CardDescription>Trend from faculty overview API.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {loading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading chart…</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid stroke="rgba(148,163,184,0.14)" />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FacultyApprovalsPage() {
  const { pending, approveEvent, rejectEvent } = useOutletContext()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const openReject = (ev) => {
    setRejectTarget(ev)
    setReason('')
    setRejectOpen(true)
  }

  const handleApprove = async (ev) => {
    setBusy(true)
    try {
      await approveEvent(ev.id)
      toast({
        title: 'Event approved',
        description: `${ev.name} is now live for students.`,
        variant: 'success',
      })
      window.location.reload()
    } catch (err) {
      toast({ title: 'Failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectTarget || !reason.trim()) return
    setBusy(true)
    try {
      await rejectEvent(rejectTarget.id, reason.trim())
      toast({
        title: 'Submission declined',
        description: `${rejectTarget.name} was returned to the organizer.`,
      })
      setRejectOpen(false)
      window.location.reload()
    } catch (err) {
      toast({ title: 'Failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Faculty" title="Event approvals" description="Approve or reject organizer submissions." />
      {pending.length ? (
        <div className="grid gap-4">
          {pending.map((ev) => (
            <Card key={ev.id} glass className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{ev.name}</h3>
                  {ev.resubmission?.wasRejectedBefore ? (
                    <Badge variant="warning" className="mt-1">Resubmitted after rejection</Badge>
                  ) : null}
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {ev.type} • {formatDate(ev.date)} {ev.time} • {ev.place}
                  </p>
                  {ev.resubmission?.previousRejectionReason ? (
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Previous rejection: {ev.resubmission.previousRejectionReason}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm line-clamp-2">{ev.description}</p>
                  {ev.createdBy && (
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                      Organizer: {ev.createdBy.name} ({ev.createdBy.email})
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="gradient" size="sm" disabled={busy} onClick={() => handleApprove(ev)}>
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => openReject(ev)}>
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="No pending events" description="You are all caught up." />
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject event</DialogTitle>
            <DialogDescription>Provide a reason for the organizer.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rej-reason">Reason</Label>
            <Textarea
              id="rej-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Venue conflict, incomplete description…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy || !reason.trim()} onClick={handleRejectSubmit}>
              Reject event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FacultyBrowsePage() {
  const { allEvents, approvedList } = useOutletContext()
  const [search, setSearch] = useState('')

  const merged = useMemo(() => {
    const byId = new Map()
    for (const e of allEvents) byId.set(e.id, e)
    for (const e of approvedList) {
      if (!byId.has(e.id)) byId.set(e.id, { ...e, status: 'approved' })
    }
    return [...byId.values()]
  }, [allEvents, approvedList])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    const base = !t
      ? merged
      : merged.filter((e) => [e.name, e.type, e.place, e.status].some((x) => String(x || '').toLowerCase().includes(t)))
    return sortCompletedLast(base)
  }, [merged, search])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Faculty" title="Browse events" description="All campus events with approval status." />
      <Card glass className="p-5">
        <DataToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search events…"
        />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((ev, i) => (
          <div key={ev.id} className="relative">
            <Badge variant="outline" className="absolute right-3 top-3 z-10 capitalize">
              {ev.status || '—'}
            </Badge>
            <EventCard
              event={ev}
              animationDelay={i * 0.04}
              onView={() => {}}
              actions={<span className="text-xs text-[var(--color-muted-foreground)]">Read-only</span>}
            />
          </div>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState icon={<Search className="h-6 w-6" />} title="No events" description="Try a different search." />
      )}
    </div>
  )
}

function FacultyLayout() {
  const data = useFacultyData()
  const { notifications, markAllRead, markRead } = useNotifications()

  return (
    <RoleLayout
      navItems={navItems}
      notifications={notifications}
      onMarkAllRead={markAllRead}
      onOpenNotification={(n) => markRead(n?.id)}
      searchPlaceholder="Search faculty…"
      outletContext={data}
    />
  )
}

export function FacultyRoutes() {
  return (
    <Routes>
      <Route element={<FacultyLayout />}>
        <Route index element={<FacultyDashboardPage />} />
        <Route path="approvals" element={<FacultyApprovalsPage />} />
        <Route path="events" element={<EventManagementPage />} />
        <Route path="events/:eventId" element={<EventDetailsPage />} />
        <Route path="browse" element={<FacultyBrowsePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationPreferencesPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  )
}
