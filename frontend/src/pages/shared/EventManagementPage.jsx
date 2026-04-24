import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EventCard } from '@/components/common/EventCard'
import { SkeletonCard } from '@/components/common/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/use-toast'
import { api, extractErrorMessage } from '@/lib/api'

function toRelativeTime(startTime) {
  const target = new Date(startTime).getTime()
  if (Number.isNaN(target)) return 'Unknown'
  const diff = target - Date.now()
  if (diff <= 0) return 'Started'
  const minutes = Math.floor(diff / 60000)
  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  if (days > 0) return `Starts in ${days}d ${hours}h`
  return `Starts in ${hours}h ${minutes % 60}m`
}

function normalizeLifecycleStatus(event) {
  if (String(event?.status || '').toLowerCase() === 'cancelled') return 'cancelled'
  const now = Date.now()
  const start = new Date(event?.startTime).getTime()
  const end = new Date(event?.endTime).getTime()
  if (Number.isNaN(start)) return String(event?.status || 'upcoming').toLowerCase()
  if (now < start) return 'upcoming'
  if (!Number.isNaN(end) && now > end) return 'completed'
  return 'ongoing'
}

function sortEventsStrictly(items = []) {
  const bucket = { upcoming: 0, ongoing: 1, completed: 2, cancelled: 2 }
  return [...items]
    .map((item) => ({ ...item, status: normalizeLifecycleStatus(item) }))
    .sort((a, b) => {
      const byBucket = (bucket[a.status] ?? 3) - (bucket[b.status] ?? 3)
      if (byBucket !== 0) return byBucket
      return new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime()
    })
}

function toDateTimeLocalValue(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export function EventManagementPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const role = currentUser?.role
  const canManageAll = ['admin', 'superAdmin'].includes(role)
  const canManageOwned = role === 'organizer'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    durationMinutes: '60',
    location: '',
  })

  const loadEvents = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (type !== 'all') params.status = type
      if (category !== 'all') params.category = category
      const res = await api.get('/api/events', { params })
      setRows(sortEventsStrictly(res.data?.events || []))
    } catch (err) {
      toast({ title: 'Failed to load events', description: extractErrorMessage(err), variant: 'destructive' })
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [search, type, category])

  const nextUpcoming = useMemo(() => rows.find((r) => r.status === 'upcoming'), [rows])

  const onStartChange = (value) => {
    setForm((prev) => {
      const next = { ...prev, startTime: value }
      const mins = Number.parseInt(prev.durationMinutes, 10)
      const start = new Date(value)
      if (Number.isFinite(mins) && mins > 0 && !Number.isNaN(start.getTime())) {
        const end = new Date(start.getTime() + mins * 60000)
        next.endTime = toDateTimeLocalValue(end)
      }
      return next
    })
  }

  const onDurationChange = (value) => {
    setForm((prev) => {
      const next = { ...prev, durationMinutes: value }
      const mins = Number.parseInt(value, 10)
      const start = new Date(prev.startTime)
      if (Number.isFinite(mins) && mins > 0 && !Number.isNaN(start.getTime())) {
        next.endTime = toDateTimeLocalValue(new Date(start.getTime() + mins * 60000))
      }
      return next
    })
  }

  const submitForm = async (e) => {
    e.preventDefault()
    try {
      const start = new Date(form.startTime)
      const end = new Date(form.endTime)
      const durationMinutes = Number.parseInt(form.durationMinutes, 10)
      if (!Number.isFinite(durationMinutes) || durationMinutes < 1) throw new Error('Duration must be at least 1 minute.')
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error('End time must be after start time.')
      if (form.id) {
        await api.put(`/api/events/${form.id}`, { ...form, durationMinutes })
        toast({ title: 'Event updated', variant: 'success' })
      } else {
        await api.post('/api/events', { ...form, durationMinutes })
        toast({ title: 'Event created', variant: 'success' })
      }
      setEditing(false)
      setForm({ id: '', title: '', description: '', startTime: '', endTime: '', durationMinutes: '60', location: '' })
      loadEvents()
    } catch (err) {
      toast({ title: 'Save failed', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  const openEdit = (row) => {
    setEditing(true)
    setForm({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      startTime: toDateTimeLocalValue(row.startTime),
      endTime: toDateTimeLocalValue(row.endTime),
      durationMinutes: String(row.durationMinutes || 60),
      location: row.location || '',
    })
  }

  return (
    <div className="space-y-5">
      <DashboardHeader
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        category={category}
        onCategoryChange={setCategory}
        user={currentUser}
        onCreateEvent={canManageAll || canManageOwned ? () => {
          setEditing(true)
          setForm({ id: '', title: '', description: '', startTime: '', endTime: '', durationMinutes: '60', location: '' })
        } : undefined}
      />

      {nextUpcoming ? (
        <Card className="border border-indigo-500/30">
          <CardContent className="py-4">
            <p className="text-sm text-[var(--color-muted-foreground)]">Next event countdown</p>
            <p className="font-semibold">{nextUpcoming.title}</p>
            <p className="text-sm">{toRelativeTime(nextUpcoming.startTime)}</p>
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <Card>
          <CardHeader><CardTitle>{form.id ? 'Edit Event' : 'Create Event'}</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitForm}>
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
              <Input placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} required />
              <Input type="datetime-local" value={form.startTime} onChange={(e) => onStartChange(e.target.value)} required />
              <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} required />
              <Input type="number" min="1" value={form.durationMinutes} onChange={(e) => onDurationChange(e.target.value)} required />
              <Textarea className="md:col-span-2" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" variant="gradient">{form.id ? 'Update' : 'Create'}</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Close</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />) : rows.map((row, i) => {
          const canEditThis = canManageAll || (canManageOwned && String(row.organizerId || '') === String(currentUser?.id || ''))
          return (
            <EventCard
              key={row.id}
              event={{
                ...row,
                name: row.title,
                date: row.startTime,
                time: new Date(row.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                place: row.location,
                type: row.type || 'academic',
              }}
              status={row.status}
              registered={false}
              onView={() => navigate(`${row.id}`)}
              animationDelay={Math.min(i * 0.03, 0.25)}
              actions={
                canEditThis ? (
                  <div className="flex w-full gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)} className="flex-1">Edit</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={async () => {
                        const reason = window.prompt('Cancellation reason (required):')
                        if (!reason || !reason.trim()) return
                        try {
                          await api.patch(`/api/events/${row.id}/cancel`, { reason: reason.trim() })
                          toast({ title: 'Event cancelled', variant: 'success' })
                          loadEvents()
                        } catch (err) {
                          toast({ title: 'Cancel failed', description: extractErrorMessage(err), variant: 'destructive' })
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
