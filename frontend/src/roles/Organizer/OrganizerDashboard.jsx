import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { BrowserMultiFormatReader } from '@zxing/browser'
import {
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  MoreVertical,
  Plus,
  QrCode,
  Search,
  Users,
  X,
  Lock,
} from 'lucide-react'
import { motion } from 'motion/react'
import { ChangePasswordModal } from '../../components/ChangePasswordModal.jsx'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']

const MOCK_EVENTS = [
  {
    id: 'e1',
    title: 'AI Workshop 2026',
    date: 'May 20, 2026',
    registeredCount: 120,
    capacity: 180,
    status: 'approved',
  },
  {
    id: 'e2',
    title: 'Annual Sports Meet',
    date: 'Jun 02, 2026',
    registeredCount: 340,
    capacity: 500,
    status: 'approved',
  },
  {
    id: 'e3',
    title: 'Research Symposium',
    date: 'Jun 15, 2026',
    registeredCount: 60,
    capacity: 120,
    status: 'pending',
  },
  {
    id: 'e4',
    title: 'Web Dev Bootcamp: React + Vite',
    date: 'May 28, 2026',
    registeredCount: 95,
    capacity: 150,
    status: 'approved',
  },
  {
    id: 'e5',
    title: 'Career Fair 2026',
    date: 'Jun 05, 2026',
    registeredCount: 420,
    capacity: 900,
    status: 'completed',
  },
]

export function OrganizerDashboard({ user, onLogout }) {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'academic',
    date: '',
    time: '',
    place: '',
    seats: '',
    thumbnail: '',
  })
  const [createError, setCreateError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editError, setEditError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    type: 'academic',
    date: '',
    time: '',
    place: '',
    seats: '',
    thumbnail: '',
    status: 'pending',
  })

  const [scannerEventId, setScannerEventId] = useState('')
  const [scannerError, setScannerError] = useState('')
  const [scannerStatus, setScannerStatus] = useState('idle') // idle | starting | scanning
  const [lastScan, setLastScan] = useState(null)
  const [isPostingScan, setIsPostingScan] = useState(false)

  const [overview, setOverview] = useState({
    stats: {
      totalEvents: 0,
      approvedEvents: 0,
      pendingApprovals: 0,
      totalScans: 0,
      avgAttendancePct: 0,
    },
    statusDistribution: [
      { name: 'Approved', value: 0 },
      { name: 'Pending', value: 0 },
      { name: 'Completed', value: 0 },
      { name: 'Rejected', value: 0 },
    ],
    topEvents: [],
  })

  const isFirstTabRender = useRef(true)

  const fetchEvents = useCallback(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setEvents([])
      return
    }
    axios
      .get(`${API_BASE_URL}/api/events/mine`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        const serverEvents = res.data?.events ?? []
        setEvents(serverEvents)
      })
      .catch(() => {
        setEvents((prev) => prev)
      })
  }, [API_BASE_URL])

  const fetchOverview = useCallback(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return
    axios
      .get(`${API_BASE_URL}/api/events/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        if (res.data?.stats && res.data?.statusDistribution) {
          setOverview(res.data)
        }
      })
      .catch(() => {})
  }, [API_BASE_URL])

  useEffect(() => {
    fetchEvents()
    fetchOverview()
  }, [API_BASE_URL, fetchEvents, fetchOverview])

  // Reload data when switching organizer drawer tabs so each tab shows fresh data
  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false
      return
    }
    fetchEvents()
    fetchOverview()
  }, [activeTab, fetchEvents, fetchOverview])

  const handleOpenCreate = () => {
    setCreateError('')
    setIsCreateOpen(true)
  }

  const handleCloseCreate = () => {
    setCreateError('')
    setIsCreateOpen(false)
  }

  const toDateInputValue = (d) => {
    if (!d) return ''
    const dateObj = typeof d === 'string' ? new Date(d) : d
    if (Number.isNaN(dateObj.getTime())) return ''
    const yyyy = dateObj.getFullYear()
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(dateObj.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const handleOpenEdit = (event) => {
    setEditError('')
    setEditingEvent(event)
    // event can be either mapped (title/date string) or server event shape
    if (event?.name) {
      setEditForm({
        name: event.name ?? '',
        description: event.description ?? '',
        type: event.type ?? 'academic',
        date: toDateInputValue(event.date),
        time: event.time ?? '',
        place: event.place ?? '',
        seats: String(event.totalSeats ?? ''),
        thumbnail: event.thumbnailUrl ?? '',
        status: event.status ?? 'pending',
      })
    } else {
      // Legacy/mocked event (limited fields)
      setEditForm((prev) => ({
        ...prev,
        name: event.title ?? '',
        date: '',
        time: '',
        place: '',
        seats: String(event.capacity ?? ''),
        thumbnail: event.thumbnailUrl ?? event.thumbnail ?? '',
        status: event.status ?? 'pending',
      }))
    }
    setIsEditOpen(true)
  }

  const handleCloseEdit = () => {
    setIsEditOpen(false)
    setEditingEvent(null)
    setEditError('')
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitEdit = (e) => {
    e.preventDefault()
    setEditError('')

    if (
      !editingEvent?.id ||
      !editForm.name.trim() ||
      !editForm.date ||
      !editForm.time ||
      !editForm.place.trim() ||
      !editForm.seats
    ) {
      setEditError(
        'Please fill in event name, date, time, place and total seats.',
      )
      return
    }

    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setEditError('You are not logged in.')
      return
    }

    setIsUpdating(true)
    axios
      .put(
        `${API_BASE_URL}/api/events/${editingEvent.id}`,
        {
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          type: editForm.type,
          date: editForm.date,
          time: editForm.time,
          place: editForm.place.trim(),
          totalSeats: Number.parseInt(editForm.seats, 10),
          thumbnailUrl: editForm.thumbnail.trim(),
          status: editForm.status,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      .then((res) => {
        const updated = res.data?.event
        if (updated) {
          setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)))
        }
        setIsEditOpen(false)
        setEditingEvent(null)
      })
      .catch((err) => {
        setEditError(
          err?.response?.data?.message ||
            'Unable to update event. Please try again.',
        )
      })
      .finally(() => setIsUpdating(false))
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitCreate = (e) => {
    e.preventDefault()
    setCreateError('')
    if (
      !form.name.trim() ||
      !form.date ||
      !form.time ||
      !form.place.trim() ||
      !form.seats
    ) {
      setCreateError(
        'Please fill in event name, date, time, place and total seats.',
      )
      return
    }

    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setCreateError('You are not logged in.')
      return
    }

    setIsSaving(true)
    axios
      .post(
        `${API_BASE_URL}/api/events`,
        {
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          date: form.date,
          time: form.time,
          place: form.place.trim(),
          totalSeats: Number.parseInt(form.seats, 10),
          thumbnailUrl: form.thumbnail.trim(),
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      .then((res) => {
        const created = res.data?.event
        if (created) {
          setEvents((prev) => [created, ...prev])
        }
        setForm({
          name: '',
          description: '',
          type: 'academic',
          date: '',
          time: '',
          place: '',
          seats: '',
          thumbnail: '',
        })
        setIsCreateOpen(false)
      })
      .catch((err) => {
        setCreateError(
          err?.response?.data?.message ||
            'Unable to create event. Please try again.',
        )
      })
      .finally(() => setIsSaving(false))
  }

  const allEvents = useMemo(
    () =>
      (events || []).map((e) => {
        if (e.title) return e
        return {
          id: e.id,
          title: e.name,
          type: e.type ?? '',
          date: new Date(e.date).toLocaleDateString(undefined, {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }),
          registeredCount: e.registeredCount ?? 0,
          capacity: e.totalSeats,
          status: e.status ?? 'pending',
          thumbnailUrl: e.thumbnailUrl ?? '',
          _server: e,
        }
      }),
    [events],
  )

  const scannerEvents = useMemo(() => {
    const base = events || []
    // Scanner should show approved events, and those marked completed after scanning.
    return base.filter((e) => e.status === 'approved' || e.status === 'completed')
  }, [events])

  return (
    <div className="h-screen bg-[#F5F5F5] overflow-hidden flex">
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
      {/* Sidebar / drawer */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-black/5 flex flex-col z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-xl tracking-tight text-indigo-600"
            >
              Organizer
            </motion.span>
          )}
          <button
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? (
              <span className="text-lg leading-none">×</span>
            ) : (
              <span className="text-lg leading-none">≡</span>
            )}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'events', label: 'My Events', icon: Calendar },
            { id: 'scanner', label: 'Ticket Scanner', icon: QrCode },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <item.icon
                size={20}
                className={cn(
                  'shrink-0',
                  activeTab === item.id
                    ? 'text-indigo-600'
                    : 'text-slate-400 group-hover:text-slate-600',
                )}
              />
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-sm"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-black/5">
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-all duration-200 mb-2"
          >
            <Lock size={18} />
            {isSidebarOpen && (
              <span className="text-sm font-medium">Change password</span>
            )}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
          >
            <MoreVertical size={18} />
            {isSidebarOpen && (
              <span className="text-sm font-medium">Sign out</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl w-[22rem] max-w-full border border-black/5">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search events or registrations..."
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-5">
            <button
              className="hidden sm:inline-flex bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold items-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
              onClick={handleOpenCreate}
            >
              <Plus size={18} /> Create event
            </button>
            <div className="flex items-center gap-3 pl-5 border-l border-black/5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {user.username}
                </p>
                <p className="text-xs text-slate-500 capitalize">organizer</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                {user.username?.charAt(0) ?? 'O'}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        {isCreateOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl border border-black/5 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative">
              <button
                type="button"
                onClick={handleCloseCreate}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500"
                aria-label="Close create event form"
              >
                <X size={18} />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Create new event
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Add event details. This form is local-only for now and will add
                to your &quot;My Events&quot; list.
              </p>
              <form
                onSubmit={handleSubmitCreate}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
              >
                {createError && (
                  <div className="md:col-span-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {createError}
                  </div>
                )}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Event name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="e.g. AI Workshop 2026"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Event type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="academic">Academic</option>
                    <option value="workshop">Work</option>
                    <option value="sports">Sports</option>
                    <option value="social">Social</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Place
                  </label>
                  <input
                    type="text"
                    value={form.place}
                    onChange={(e) => handleFormChange('place', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="e.g. Innovation Lab"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Total number of seats
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.seats}
                    onChange={(e) => handleFormChange('seats', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="e.g. 150"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Event description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      handleFormChange('description', e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                    placeholder="Brief description of the event..."
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Thumbnail image URL
                  </label>
                  <input
                    type="url"
                    value={form.thumbnail}
                    onChange={(e) =>
                      handleFormChange('thumbnail', e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    For now this is stored only in the browser and used for
                    display.
                  </p>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseCreate}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving…' : 'Save event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isEditOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl border border-black/5 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500"
                aria-label="Close edit event form"
              >
                <X size={18} />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Edit event
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Update this event and save changes.
              </p>
              <form
                onSubmit={handleSubmitEdit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
              >
                {editError && (
                  <div className="md:col-span-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {editError}
                  </div>
                )}

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Event name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Event type
                  </label>
                  <select
                    value={editForm.type}
                    onChange={(e) => handleEditChange('type', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="academic">Academic</option>
                    <option value="work">Work</option>
                    <option value="sports">Sports</option>
                    <option value="social">Social</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => handleEditChange('status', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => handleEditChange('date', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Time
                  </label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => handleEditChange('time', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Place
                  </label>
                  <input
                    type="text"
                    value={editForm.place}
                    onChange={(e) => handleEditChange('place', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Total number of seats
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.seats}
                    onChange={(e) => handleEditChange('seats', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Event description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      handleEditChange('description', e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Thumbnail image URL
                  </label>
                  <input
                    type="url"
                    value={editForm.thumbnail}
                    onChange={(e) =>
                      handleEditChange('thumbnail', e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

          {/* Page header text based on tab */}
          <div className="flex items-center justify-between gap-4">
            <div>
              {activeTab === 'overview' && (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Organizer Hub
                  </h1>
                  <p className="text-slate-500 mt-1">
                    Manage your events and track attendance in real-time.
                  </p>
                </>
              )}
              {activeTab === 'events' && (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    My Events
                  </h1>
                  <p className="text-slate-500 mt-1">
                    See all events you manage, with registrations and status.
                  </p>
                </>
              )}
            </div>
            <button
              className="sm:hidden bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
              onClick={handleOpenCreate}
            >
              <Plus size={18} /> Create event
            </button>
          </div>

          {/* Overview tab: stats + quick charts */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    label: 'Active Events',
                    value: String(overview.stats.approvedEvents ?? 0),
                    icon: Calendar,
                    color: 'bg-indigo-50 text-indigo-600',
                  },
                  {
                    label: 'Total Registrations',
                    value: String(overview.stats.totalRegistrations ?? 0),
                    icon: Users,
                    color: 'bg-emerald-50 text-emerald-600',
                  },
                  {
                    label: 'Avg. Attendance',
                    value: `${overview.stats.avgAttendancePct ?? 0}%`,
                    icon: CheckCircle2,
                    color: 'bg-orange-50 text-orange-600',
                  },
                  {
                    label: 'Pending Approvals',
                    value: String(overview.stats.pendingApprovals ?? 0),
                    icon: Clock,
                    color: 'bg-purple-50 text-purple-600',
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm"
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center mb-4',
                        stat.color,
                      )}
                    >
                      <stat.icon size={24} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      {stat.label}
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">
                      {stat.value}
                    </h3>
                  </motion.div>
                ))}
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Registration Trends (compact for overview) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-8">
                    Check-ins (Top events)
                  </h2>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.topEvents.slice(0, 6)}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#F1F5F9"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#64748B' }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#64748B' }}
                        />
                        <Tooltip
                          cursor={{ fill: '#F8FAFC' }}
                          contentStyle={{
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow:
                              '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Bar
                          dataKey="scans"
                          fill="#4F46E5"
                          radius={[6, 6, 0, 0]}
                          barSize={36}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Event Status Distribution */}
                <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-8">
                    Event Status
                  </h2>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overview.statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {overview.statusDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {overview.statusDistribution.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[i] }}
                        />
                        <span className="text-xs font-medium text-slate-600">
                          {item.name} ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'scanner' && (
            <TicketScannerPanel
              apiBaseUrl={API_BASE_URL}
              scannerEvents={scannerEvents}
              scannerEventId={scannerEventId}
              setScannerEventId={setScannerEventId}
              scannerError={scannerError}
              setScannerError={setScannerError}
              scannerStatus={scannerStatus}
              setScannerStatus={setScannerStatus}
              lastScan={lastScan}
              setLastScan={setLastScan}
              isPostingScan={isPostingScan}
              setIsPostingScan={setIsPostingScan}
              onRecordedScan={() => {
                fetchEvents()
                fetchOverview()
              }}
              onMarkedCompleted={() => {
                fetchEvents()
                fetchOverview()
              }}
            />
          )}

          {/* Events tab: full managed events table */}
          {activeTab === 'events' && (
            <section className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-black/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    My Managed Events
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Quick view of your events, registrations and statuses.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Filter events..."
                      className="pl-10 pr-4 py-2 bg-slate-50 border border-black/5 rounded-xl text-sm outline-none w-60 md:w-72"
                    />
                  </div>
                  <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <MoreVertical size={20} className="text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-black/5">
                    <tr>
                      <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Event Name
                      </th>
                      <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Type
                      </th>
                      <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Thumbnail
                      </th>
                      <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Date
                      </th>
                      <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Registrations
                      </th>
                      <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 md:px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {allEvents.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-6 md:px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <Calendar size={20} />
                            </div>
                            <span className="font-bold text-slate-900">
                              {event.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 md:px-8 py-4">
                          {event.type ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-100">
                              {event.type}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 md:px-8 py-4">
                          {event.thumbnailUrl ? (
                            <img
                              src={event.thumbnailUrl}
                              alt={`${event.title} thumbnail`}
                              className="w-16 h-10 rounded-xl object-cover border border-black/5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 md:px-8 py-4 text-sm text-slate-600">
                          {event.date}
                        </td>
                        <td className="px-6 md:px-8 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{
                                  width: `${(event.registeredCount / event.capacity) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-600">
                              {event.registeredCount}/{event.capacity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 md:px-8 py-4">
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border',
                              event.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : event.status === 'pending'
                                  ? 'bg-orange-50 text-orange-600 border-orange-100'
                                  : 'bg-red-50 text-red-600 border-red-100',
                            )}
                          >
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 md:px-8 py-4">
                          <button
                            className="text-indigo-600 font-bold text-sm hover:underline"
                            onClick={() =>
                              handleOpenEdit(event._server ? event._server : event)
                            }
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* No separate analytics tab – analytics are included in overview */}
        </main>
      </div>
    </div>
  )
}

function TicketScannerPanel({
  apiBaseUrl,
  scannerEvents,
  scannerEventId,
  setScannerEventId,
  scannerError,
  setScannerError,
  scannerStatus,
  setScannerStatus,
  lastScan,
  setLastScan,
  isPostingScan,
  setIsPostingScan,
  onRecordedScan,
  onMarkedCompleted,
}) {
  const [videoEl, setVideoEl] = useState(null)

  const parseEventStartMs = (ev) => {
    if (!ev?.date || !ev?.time) return null
    const d = new Date(ev.date)
    if (Number.isNaN(d.getTime())) return null
    const [hh, mm] = String(ev.time).split(':')
    const h = Number.parseInt(hh, 10)
    const m = Number.parseInt(mm, 10)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    d.setHours(h, m, 0, 0)
    return d.getTime()
  }

  // Assumption: an event is "occurring" within 2 hours from start time.
  const pickActiveEventId = (items) => {
    const now = Date.now()
    const windowMs = 2 * 60 * 60 * 1000
    const enriched = (items || [])
      .map((e) => ({ e, startMs: parseEventStartMs(e) }))
      .filter((x) => x.startMs)
      .sort((a, b) => a.startMs - b.startMs)

    const ongoing = enriched.find(
      (x) => now >= x.startMs && now < x.startMs + windowMs,
    )
    if (ongoing) return ongoing.e.id

    // Else: pick the next upcoming event (closest in the future)
    const upcoming = enriched.find((x) => x.startMs > now)
    if (upcoming) return upcoming.e.id

    // Else: pick the most recent past event
    return enriched.length ? enriched[enriched.length - 1].e.id : ''
  }

  const currentEvent = useMemo(
    () => (scannerEvents || []).find((e) => e.id === scannerEventId) || null,
    [scannerEvents, scannerEventId],
  )

  useEffect(() => {
    if (!scannerEvents?.length) return
    if (!scannerEventId) setScannerEventId(pickActiveEventId(scannerEvents))
  }, [scannerEvents, scannerEventId, setScannerEventId])

  useEffect(() => {
    if (!videoEl) return
    if (scannerStatus !== 'scanning') return
    if (!scannerEventId) return
    if (currentEvent?.status === 'completed') {
      setScannerError('This event is completed. Scanning is disabled.')
      setScannerStatus('idle')
      return
    }

    const reader = new BrowserMultiFormatReader()
    let stopRequested = false

    setScannerError('')
    setLastScan(null)

    reader
      .decodeFromVideoDevice(undefined, videoEl, (result, err) => {
        if (stopRequested) return
        if (result) {
          const text = result.getText()
          setLastScan({ text, scannedAt: Date.now() })
          setScannerStatus('idle')
        } else if (err && err.name !== 'NotFoundException') {
          setScannerError('Unable to read QR. Try adjusting the camera angle.')
        }
      })
      .catch(() => {
        setScannerError(
          'Camera access denied or not available. Please allow camera permission.',
        )
        setScannerStatus('idle')
      })

    return () => {
      stopRequested = true
      try {
        reader.reset()
      } catch {
        // ignore
      }
      // Stop camera stream so the camera turns off when organizer clicks "Stop scanning"
      if (videoEl?.srcObject && typeof MediaStream !== 'undefined') {
        const stream = videoEl.srcObject
        if (stream instanceof MediaStream) {
          stream.getTracks().forEach((track) => track.stop())
        }
        videoEl.srcObject = null
      }
    }
  }, [
    videoEl,
    scannerStatus,
    scannerEventId,
    currentEvent?.status,
    setLastScan,
    setScannerError,
    setScannerStatus,
  ])

  const postScan = async () => {
    if (!lastScan?.text || !scannerEventId) return
    setIsPostingScan(true)
    setScannerError('')
    try {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) throw new Error('not_logged_in')
      await axios.post(
        `${apiBaseUrl}/api/events/${scannerEventId}/checkin`,
        { rawQr: lastScan.text },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      try {
        onRecordedScan?.()
      } catch {
        // ignore
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.message === 'not_logged_in' ? 'You are not logged in.' : null) ||
        'Failed to record scan.'
      setScannerError(msg)
    } finally {
      setIsPostingScan(false)
    }
  }

  const markCompleted = async () => {
    if (!scannerEventId) return
    setScannerError('')
    try {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) throw new Error('not_logged_in')
      await axios.put(
        `${apiBaseUrl}/api/events/${scannerEventId}`,
        { status: 'completed' },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      setScannerStatus('idle')
      setLastScan(null)
      setScannerError('Event marked as completed.')
      try {
        onMarkedCompleted?.()
      } catch {
        // ignore
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.message === 'not_logged_in' ? 'You are not logged in.' : null) ||
        'Failed to mark event completed.'
      setScannerError(msg)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Ticket Scanner
        </h1>
        <p className="text-slate-500 mt-1">
          Scan user QR codes for accepted events and record attendance.
        </p>
      </div>

      {!scannerEvents?.length && (
        <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
          <p className="text-sm text-slate-600">
            No accepted (approved) events found yet. Once an event is approved,
            it will appear here for scanning.
          </p>
        </div>
      )}

      {scannerEvents?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-[28px] border border-black/5 shadow-sm space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">
                  Approved events
                </p>
                <span className="text-[11px] text-slate-400">
                  Click to scan
                </span>
              </div>

              <div className="space-y-2">
                {scannerEvents.map((e) => {
                  const isSelected = e.id === scannerEventId
                  const badge =
                    e.status === 'completed' ? 'Completed' : 'Active'
                  const badgeClass =
                    e.status === 'completed'
                      ? 'bg-slate-50 text-slate-600 border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  const registered = Number(e.registeredCount ?? 0)
                  const scanned = Number(e.scannedCount ?? 0)

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        if (scannerStatus === 'scanning') return
                        setScannerEventId(e.id)
                        setScannerError('')
                        setLastScan(null)
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-2xl border transition-colors',
                        isSelected
                          ? 'bg-indigo-50/60 border-indigo-100'
                          : 'bg-white border-black/5 hover:bg-slate-50',
                      )}
                      disabled={scannerStatus === 'scanning'}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {e.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(e.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                            })}{' '}
                            • {e.time}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Scanned{' '}
                            <span className="font-semibold text-slate-700">
                              {scanned}
                            </span>
                            {' / '}
                            Registered{' '}
                            <span className="font-semibold text-slate-700">
                              {registered}
                            </span>
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border',
                            badgeClass,
                          )}
                        >
                          {badge}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setScannerStatus((s) => (s === 'scanning' ? 'idle' : 'scanning'))
              }
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors border',
                scannerStatus === 'scanning'
                  ? 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700',
              )}
              disabled={!scannerEventId || currentEvent?.status === 'completed'}
            >
              <QrCode size={18} />
              {scannerStatus === 'scanning' ? 'Stop scanning' : 'Start scanning'}
            </button>

            <button
              type="button"
              onClick={markCompleted}
              disabled={!scannerEventId || currentEvent?.status === 'completed'}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-2xl text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Mark event completed
            </button>

            {scannerError && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {scannerError}
              </div>
            )}

            {lastScan && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 space-y-2">
                <p className="text-sm font-bold text-emerald-800">
                  QR scanned
                </p>
                <p className="text-xs text-emerald-900 break-words">
                  {lastScan.text}
                </p>
                <button
                  type="button"
                  onClick={postScan}
                  disabled={isPostingScan}
                  className="w-full mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPostingScan ? 'Recording…' : 'Record scan'}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-[28px] border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Camera</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Keep the QR code within the frame.
                </p>
              </div>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border',
                  scannerStatus === 'scanning'
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    : 'bg-slate-50 text-slate-600 border-slate-100',
                )}
              >
                {scannerStatus === 'scanning' ? 'Scanning' : 'Idle'}
              </span>
            </div>

            <div className="relative rounded-3xl overflow-hidden border border-black/5 bg-black aspect-video">
              <video
                ref={setVideoEl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 rounded-2xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
