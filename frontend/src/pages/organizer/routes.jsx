import {
  Activity,
<<<<<<< HEAD
=======
  ImagePlus,
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  PenSquare,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DataTable, StatusBadge } from '@/components/common/DataTable'
import { DataToolbar } from '@/components/common/DataToolbar'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { RoleLayout } from '@/components/common/RoleLayout'
import { useNotifications } from '@/hooks/useNotifications'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { ProfilePage } from '@/pages/student/ProfilePage'
import { NotificationPreferencesPage } from '@/pages/shared/NotificationPreferencesPage'
import { EventManagementPage } from '@/pages/shared/EventManagementPage'
import { EventDetailsPage } from '@/pages/shared/EventDetailsPage'

const PIE_COLORS = ['#4F46E5', '#14B8A6', '#06B6D4', '#F59E0B']

const MOCK_OVERVIEW = {
  stats: {
    totalEvents: 4,
    approvedEvents: 2,
    pendingApprovals: 1,
    totalRegistrations: 186,
    totalAttendance: 142,
    avgAttendancePct: 76,
  },
  statusDistribution: [
    { name: 'Approved', value: 2 },
    { name: 'Pending', value: 1 },
    { name: 'Completed', value: 1 },
    { name: 'Rejected', value: 0 },
  ],
  topEvents: [
    { id: '1', name: 'AI Research Symposium', registrations: 72, scans: 54, totalSeats: 100 },
    { id: '2', name: 'Cloud Native Workshop', registrations: 48, scans: 39, totalSeats: 60 },
    { id: '3', name: 'Design Sprint Lab', registrations: 36, scans: 28, totalSeats: 40 },
  ],
}

const MOCK_EVENTS = [
  {
    id: '1',
    name: 'AI Research Symposium 2026',
    description: 'Research showcase with keynotes and demos.',
    type: 'Academic',
    date: '2026-04-28T00:00:00.000Z',
    time: '09:00 AM',
    place: 'Main Auditorium',
    totalSeats: 180,
    registeredCount: 138,
    scannedCount: 0,
    thumbnailUrl: '',
    status: 'approved',
    createdAt: '2026-04-01T09:00:00.000Z',
  },
  {
    id: '2',
    name: 'UI Engineering Bootcamp',
    description: 'Hands-on frontend craft.',
    type: 'Workshop',
    date: '2026-05-03T00:00:00.000Z',
    time: '01:30 PM',
    place: 'Innovation Lab 2',
    totalSeats: 80,
    registeredCount: 56,
    scannedCount: 0,
    thumbnailUrl: '',
    status: 'pending',
    createdAt: '2026-04-04T12:00:00.000Z',
  },
]

const navItems = [
  { to: '/organizer', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
  { to: '/organizer/events', label: 'My Events', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/organizer/event-tab', label: 'Event Tab', icon: <CalendarDays className="h-4 w-4" /> },
  { to: '/organizer/scanner', label: 'Ticket Scanner', icon: <ScanLine className="h-4 w-4" /> },
  { to: '/organizer/feedback', label: 'Student Feedback', icon: <Sparkles className="h-4 w-4" /> },
  { to: '/organizer/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
]

function formatDate(value, opts = {}) {
  if (!value) return 'TBD'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', ...opts })
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

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function useOrganizerData() {
  const [overview, setOverview] = useState(MOCK_OVERVIEW)
  const [events, setEvents] = useState(MOCK_EVENTS)
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const [overviewRes, eventsRes, feedbackRes] = await Promise.allSettled([
          api.get('/api/events/overview'),
          api.get('/api/events/mine'),
          api.get('/api/events/mine/feedbacks'),
        ])
        if (ignore) return
        if (overviewRes.status === 'fulfilled' && overviewRes.value.data) {
          setOverview((prev) => ({ ...prev, ...overviewRes.value.data }))
        }
        if (eventsRes.status === 'fulfilled' && eventsRes.value.data?.events) {
          setEvents(eventsRes.value.data.events)
        }
        if (feedbackRes.status === 'fulfilled' && feedbackRes.value.data?.feedbacks) {
          setFeedbacks(feedbackRes.value.data.feedbacks)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const saveEvent = async (payload, existingEvent) => {
    const method = existingEvent ? 'put' : 'post'
    const url = existingEvent ? `/api/events/${existingEvent.id}` : '/api/events'
<<<<<<< HEAD
    const res = await api[method](url, payload)
=======
    const hasNewImages = Array.isArray(payload.imageFiles) && payload.imageFiles.length > 0
    const hasExistingImages = Array.isArray(payload.existingImages) && payload.existingImages.length > 0

    let res
    if (hasNewImages || hasExistingImages) {
      const formData = new FormData()
      formData.append('name', payload.name || '')
      formData.append('description', payload.description || '')
      formData.append('type', payload.type || 'work')
      formData.append('date', payload.date || '')
      formData.append('time', payload.time || '')
      formData.append('place', payload.place || '')
      formData.append('totalSeats', String(payload.totalSeats || 0))
      formData.append('requestReapproval', payload.requestReapproval ? 'true' : 'false')
      formData.append('existingImageUrls', JSON.stringify(payload.existingImages || []))
      for (const file of payload.imageFiles || []) {
        formData.append('images', file)
      }
      res = await api[method](url, formData)
    } else {
      // Fallback to JSON request when no images selected.
      // This keeps event create/edit working even if backend isn't restarted yet.
      res = await api[method](url, {
        name: payload.name || '',
        description: payload.description || '',
        type: payload.type || 'work',
        date: payload.date || '',
        time: payload.time || '',
        place: payload.place || '',
        totalSeats: Number(payload.totalSeats || 0),
        requestReapproval: Boolean(payload.requestReapproval),
      })
    }
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
    const event = res.data?.event
    if (event) {
      setEvents((prev) =>
        existingEvent
          ? prev.map((item) => (item.id === existingEvent.id ? { ...item, ...event } : item))
          : [event, ...prev],
      )
    }
    return event
  }

  const scanTicket = async (eventId, rawQr) => {
    const res = await api.post(`/api/events/${eventId}/checkin`, { rawQr })
    return res.data
  }

  return { overview, events, feedbacks, loading, saveEvent, scanTicket }
}

function EventDialog({ open, onOpenChange, initialEvent, onSubmit }) {
<<<<<<< HEAD
=======
  const today = new Date().toISOString().slice(0, 10)
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'work',
    date: '',
    time: '',
    place: '',
    totalSeats: '',
<<<<<<< HEAD
    thumbnailUrl: '',
=======
    imageFiles: [],
    existingImages: [],
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
    requestReapproval: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      name: initialEvent?.name ?? '',
      description: initialEvent?.description ?? '',
      type: initialEvent?.type ?? 'work',
      date: initialEvent?.date ? new Date(initialEvent.date).toISOString().slice(0, 10) : '',
      time: initialEvent?.time ?? '',
      place: initialEvent?.place ?? '',
      totalSeats: initialEvent?.totalSeats ? String(initialEvent.totalSeats) : '',
<<<<<<< HEAD
      thumbnailUrl: initialEvent?.thumbnailUrl ?? '',
=======
      imageFiles: [],
      existingImages: Array.isArray(initialEvent?.images)
        ? initialEvent.images
        : (initialEvent?.thumbnailUrl ? [initialEvent.thumbnailUrl] : []),
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
      requestReapproval: false,
    })
  }, [initialEvent, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
<<<<<<< HEAD
=======
    if (!form.place) {
      toast({
        title: 'Venue is required',
        description: 'Please select a venue.',
        variant: 'destructive',
      })
      return
    }
    if (!initialEvent && form.date && form.date < today) {
      toast({
        title: 'Invalid date',
        description: 'Please select today or a future date.',
        variant: 'destructive',
      })
      return
    }
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
    setSaving(true)
    try {
      await onSubmit({
        ...form,
        totalSeats: Number(form.totalSeats || 0),
        date: form.date || undefined,
<<<<<<< HEAD
=======
        imageFiles: form.imageFiles || [],
        existingImages: form.existingImages || [],
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialEvent ? 'Edit event' : 'Create event'}</DialogTitle>
          <DialogDescription>Submit details for faculty approval.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="event-name">Event name</Label>
            <Input
              id="event-name"
              value={form.name}
              onChange={(ev) => setForm((p) => ({ ...p, name: ev.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={form.description}
              onChange={(ev) => setForm((p) => ({ ...p, description: ev.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
<<<<<<< HEAD
                <SelectTrigger>
=======
                <SelectTrigger className="h-11">
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-seats">Total seats</Label>
              <Input
                id="event-seats"
                type="number"
                min="1"
<<<<<<< HEAD
=======
                className="h-11"
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
                value={form.totalSeats}
                onChange={(ev) => setForm((p) => ({ ...p, totalSeats: ev.target.value }))}
                required
              />
            </div>
          </div>
          {initialEvent && ['approved', 'rejected'].includes(initialEvent.status) ? (
            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Request re-approval</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Edited {initialEvent.status} events must be reviewed again by admin/faculty.
                  </p>
                </div>
                <Switch
                  checked={Boolean(form.requestReapproval)}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, requestReapproval: v }))}
                />
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
<<<<<<< HEAD
=======
                min={today}
                className="h-11"
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
                value={form.date}
                onChange={(ev) => setForm((p) => ({ ...p, date: ev.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                type="time"
<<<<<<< HEAD
=======
                className="h-11"
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
                value={form.time}
                onChange={(ev) => setForm((p) => ({ ...p, time: ev.target.value }))}
                required
              />
            </div>
          </div>
<<<<<<< HEAD
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="event-place">Venue</Label>
              <Input
                id="event-place"
                value={form.place}
                onChange={(ev) => setForm((p) => ({ ...p, place: ev.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-thumb">Thumbnail URL</Label>
              <Input
                id="event-thumb"
                value={form.thumbnailUrl}
                onChange={(ev) => setForm((p) => ({ ...p, thumbnailUrl: ev.target.value }))}
              />
=======
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-place">Venue</Label>
              <Select value={form.place} onValueChange={(v) => setForm((p) => ({ ...p, place: v }))}>
                <SelectTrigger id="event-place" className="h-11">
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="201">201</SelectItem>
                  <SelectItem value="301">301</SelectItem>
                  <SelectItem value="501">501</SelectItem>
                  <SelectItem value="Main hall">Main hall</SelectItem>
                  <SelectItem value="Auditorium">Auditorium</SelectItem>
                  <SelectItem value="Main ground">Main ground</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-images">Event images (up to 3)</Label>
              <Input
                id="event-images"
                type="file"
                accept="image/*"
                multiple
                className="h-11"
                onChange={(ev) => {
                  const files = Array.from(ev.target.files || []).slice(0, 3)
                  setForm((p) => ({ ...p, imageFiles: files }))
                }}
              />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Upload up to 3 images. First image will be used as cover.
              </p>
              {(form.imageFiles?.length || form.existingImages?.length) ? (
                <div className="rounded-lg border border-[var(--color-border)] p-2 text-xs text-[var(--color-muted-foreground)]">
                  <p className="mb-1 font-medium text-[var(--color-foreground)] inline-flex items-center gap-1">
                    <ImagePlus className="h-3.5 w-3.5" />
                    Selected images
                  </p>
                  {(form.imageFiles?.length ? form.imageFiles.map((f) => f.name) : form.existingImages.slice(0, 3)).map((name, idx) => (
                    <p key={`${name}-${idx}`}>{idx + 1}. {name}</p>
                  ))}
                </div>
              ) : null}
>>>>>>> 3f26ff8904b6d07e945fb565833ac66ff3cd1cbd
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving ? 'Saving…' : initialEvent ? 'Save changes' : 'Create event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OrganizerOverviewPage() {
  const { overview, loading } = useOutletContext()
  const stats = overview?.stats ?? MOCK_OVERVIEW.stats
  const statusDistribution = overview?.statusDistribution ?? MOCK_OVERVIEW.statusDistribution
  const topEvents = overview?.topEvents ?? MOCK_OVERVIEW.topEvents

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizer"
        title="Command center"
        description="Track performance, approvals, and attendance in one place."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active events"
          value={stats.approvedEvents}
          icon={<CalendarDays className="h-5 w-5" />}
          accent="indigo"
          hint="Approved and live"
        />
        <StatCard
          label="Total registrations"
          value={stats.totalRegistrations}
          icon={<Users className="h-5 w-5" />}
          accent="teal"
        />
        <StatCard
          label="Avg attendance"
          value={`${stats.avgAttendancePct}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="cyan"
          hint="QR scans vs registrations"
        />
        <StatCard
          label="Pending approvals"
          value={stats.pendingApprovals}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="amber"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card glass>
          <CardHeader>
            <CardTitle>Top events</CardTitle>
            <CardDescription>Registrations vs check-ins.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEvents}>
                <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} hide={topEvents.length > 4} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="registrations" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                <Bar dataKey="scans" fill="#14B8A6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card glass>
          <CardHeader>
            <CardTitle>Status overview</CardTitle>
            <CardDescription>Pipeline for your submissions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[200px_1fr] lg:items-center">
            <div className="mx-auto h-[200px] w-full max-w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={4}
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {statusDistribution.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/25 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="text-[var(--color-muted-foreground)]">{item.value}</span>
                </div>
              ))}
              {loading && (
                <p className="text-xs text-[var(--color-muted-foreground)]">Syncing live metrics…</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OrganizerEventsPage() {
  const { events, saveEvent } = useOutletContext()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase()
    const base = !term ? events : events.filter((ev) =>
      [ev.name, ev.type, ev.place, ev.status].some((v) => String(v || '').toLowerCase().includes(term)),
    )
    return sortCompletedLast(base)
  }, [events, search])

  const handleExport = () => {
    downloadCsv('organizer-events.csv', [
      ['Event', 'Category', 'Date', 'Venue', 'Status', 'Registrations', 'Scans'],
      ...filteredEvents.map((ev) => [
        ev.name,
        ev.type,
        formatDate(ev.date),
        ev.place,
        ev.status,
        ev.registeredCount ?? 0,
        ev.scannedCount ?? 0,
      ]),
    ])
    toast({
      title: 'Export ready',
      description: 'Your CSV has been downloaded.',
      variant: 'success',
    })
  }

  const handleSubmit = async (payload) => {
    try {
      await saveEvent(payload, editingEvent)
      toast({
        title: editingEvent ? 'Event updated' : 'Event created',
        description: editingEvent
          ? 'Changes are saved and visible where applicable.'
          : 'Your event is saved and pending approval.',
        variant: 'success',
      })
      setEditingEvent(null)
    } catch (err) {
      toast({
        title: 'Save failed',
        description: extractErrorMessage(err, 'Try again.'),
        variant: 'destructive',
      })
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Event',
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            {row.type} • {formatDate(row.date)} • {row.place}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'registrations', header: 'Regs', render: (row) => row.registeredCount ?? 0 },
    { key: 'scans', header: 'Scans', render: (row) => row.scannedCount ?? 0 },
    {
      key: 'actions',
      header: '',
      cellClassName: 'w-[120px]',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingEvent(row)
            setDialogOpen(true)
          }}
        >
          <PenSquare className="h-4 w-4" />
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizer"
        title="My events"
        description="Manage your lineup and export reports."
        actions={
          <Button
            variant="gradient"
            onClick={() => {
              setEditingEvent(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        }
      />
      <Card glass className="p-5">
        <DataToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, venue, status…"
          trailing={
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        />
      </Card>
      <Card glass className="p-5">
        <DataTable columns={columns} rows={filteredEvents} emptyMessage="No events match filters." />
      </Card>
      <EventDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingEvent(null)
        }}
        initialEvent={editingEvent}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function OrganizerScannerPage() {
  const { events, scanTicket } = useOutletContext()
  const approvedEvents = events.filter((e) => e.status === 'approved')
  const [selectedEventId, setSelectedEventId] = useState(approvedEvents[0]?.id ?? '')
  const [rawQr, setRawQr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  useEffect(() => {
    if (!selectedEventId && approvedEvents[0]?.id) setSelectedEventId(approvedEvents[0].id)
  }, [approvedEvents, selectedEventId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEventId || !rawQr.trim()) return
    setSubmitting(true)
    try {
      const result = await scanTicket(selectedEventId, rawQr.trim())
      setLastResult(result)
      setRawQr('')
      toast({
        title: 'Check-in recorded',
        description: result?.message || 'Attendance has been updated.',
        variant: 'success',
      })
    } catch (err) {
      setLastResult(null)
      toast({
        title: 'Check-in failed',
        description: extractErrorMessage(err, 'Verify QR and try again.'),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Organizer" title="Ticket scanner" description="Paste QR payload for manual check-in." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card glass>
          <CardHeader>
            <CardTitle>Validate ticket</CardTitle>
            <CardDescription>Select an approved event, then paste the ticket QR string.</CardDescription>
          </CardHeader>
          <CardContent>
            {approvedEvents.length ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label>Event</Label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose event" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedEvents.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="raw-qr">QR payload</Label>
                  <Textarea
                    id="raw-qr"
                    value={rawQr}
                    onChange={(ev) => setRawQr(ev.target.value)}
                    className="min-h-[140px]"
                    placeholder="Paste encoded ticket data"
                  />
                </div>
                <Button type="submit" variant="gradient" disabled={submitting}>
                  <QrCode className="h-4 w-4" />
                  {submitting ? 'Recording…' : 'Record check-in'}
                </Button>
              </form>
            ) : (
              <EmptyState compact icon={<ScanLine className="h-6 w-6" />} title="No approved events" description="Approve an event first." />
            )}
          </CardContent>
        </Card>
        <Card glass>
          <CardHeader>
            <CardTitle>Last result</CardTitle>
          </CardHeader>
          <CardContent>
            {lastResult ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/25 p-4 text-sm">
                <Badge variant="success" className="mb-2">
                  OK
                </Badge>
                <p>{lastResult.message}</p>
                {lastResult.checkIn && (
                  <p className="mt-2 text-[var(--color-muted-foreground)]">
                    Scanned {formatDate(lastResult.checkIn.scannedAt, { hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState compact icon={<Search className="h-6 w-6" />} title="No scan yet" description="Results appear after a successful check-in." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OrganizerFeedbackPage() {
  const { feedbacks } = useOutletContext()

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Organizer" title="Student feedback" description="Ratings and comments for your events." />
      {feedbacks.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {feedbacks.map((item) => (
            <Card key={item.id} glass className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.eventName || item.event?.name || 'Event'}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {item.student?.name} • {item.student?.email}
                  </p>
                </div>
                <Badge variant="info">{item.rating}/5</Badge>
              </div>
              <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{item.comment || '—'}</p>
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{formatDate(item.createdAt)}</p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No feedback yet" description="Feedback will show after students submit reviews." />
      )}
    </div>
  )
}

function OrganizerLayout() {
  const navigate = useNavigate()
  const data = useOrganizerData()
  const { notifications, markAllRead, markRead } = useNotifications()

  return (
    <RoleLayout
      navItems={navItems}
      primaryCta={{
        label: 'Create Event',
        icon: <Plus className="h-4 w-4" />,
        onClick: () => navigate('/organizer/events'),
      }}
      notifications={notifications}
      onMarkAllRead={markAllRead}
      onOpenNotification={(n) => markRead(n?.id)}
      searchPlaceholder="Search organizer…"
      outletContext={data}
    />
  )
}

export function OrganizerRoutes() {
  return (
    <Routes>
      <Route element={<OrganizerLayout />}>
        <Route index element={<OrganizerOverviewPage />} />
        <Route path="events" element={<OrganizerEventsPage />} />
        <Route path="event-tab" element={<EventManagementPage />} />
        <Route path="event-tab/:eventId" element={<EventDetailsPage />} />
        <Route path="scanner" element={<OrganizerScannerPage />} />
        <Route path="feedback" element={<OrganizerFeedbackPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationPreferencesPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  )
}
