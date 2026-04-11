import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Users,
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  MapPin,
  ChevronRight,
  LayoutDashboard,
  Menu,
  X,
  Search,
  LogOut,
  Bell,
  Lock,
} from 'lucide-react'
import { motion } from 'motion/react'
import { ChangePasswordModal } from '../../components/ChangePasswordModal.jsx'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

const formatDateLabel = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

const MOCK_EVENTS = [
  {
    id: 'e1',
    title: 'AI Workshop 2026',
    description: 'Learn the basics of machine learning and modern AI tools.',
    dateLabel: 'May 20, 2026',
    time: '10:00 AM',
    location: 'Innovation Lab',
    category: 'workshop',
    registeredCount: 45,
    capacity: 100,
    image:
      'https://images.unsplash.com/photo-1526378722445-7b3f2d79b3be?auto=format&fit=crop&w=1200&q=60',
  },
  {
    id: 'e3',
    title: 'Research Symposium',
    description: 'Showcase of the latest projects from students and staff.',
    dateLabel: 'Jun 15, 2026',
    time: '01:00 PM',
    location: 'Conference Hall B',
    category: 'academic',
    registeredCount: 32,
    capacity: 80,
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=60',
  },
  {
    id: 'e4',
    title: 'Web Dev Bootcamp: React + Vite',
    description: 'Hands-on session building modern UIs and shipping fast.',
    dateLabel: 'May 28, 2026',
    time: '02:00 PM',
    location: 'Lab 3 (CS Building)',
    category: 'workshop',
    registeredCount: 76,
    capacity: 120,
    image:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=60',
  },
  {
    id: 'e7',
    title: 'Math Olympiad Qualifier',
    description: 'Challenge round for students competing in the national event.',
    dateLabel: 'Jun 12, 2026',
    time: '11:00 AM',
    location: 'Lecture Hall 2',
    category: 'academic',
    registeredCount: 38,
    capacity: 60,
    image:
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=1200&q=60',
  },
]

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'approvals', label: 'Event Approvals', icon: Clock },
  { id: 'events', label: 'Browse Events', icon: Calendar },
]

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

export function FacultyCoordinatorDashboard({ user, onLogout }) {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [overview, setOverview] = useState({
    stats: {
      totalEvents: 0,
      pendingApprovals: 0,
      approvedEvents: 0,
      rejectedEvents: 0,
      completedEvents: 0,
    },
    trends: [],
  })
  const unreadCount = (notifications || []).filter((n) => !n.read).length

  const [pendingEvents, setPendingEvents] = useState([])
  const [pendingError, setPendingError] = useState('')
  const [pendingStatus, setPendingStatus] = useState('idle') // idle | loading
  const [actionBusyById, setActionBusyById] = useState({})
  const [rejectModal, setRejectModal] = useState({ open: false, event: null, reason: '' })

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return

    axios
      .get(`${API_BASE_URL}/api/faculty/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        if (res.data?.stats) setOverview(res.data)
      })
      .catch(() => {
        // keep defaults
      })

    axios
      .get(`${API_BASE_URL}/api/faculty/notifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        const items = res.data?.notifications ?? []
        setNotifications(
          items.map((n) => ({
            ...n,
            dateLabel: formatDateLabel(n.createdAt),
          })),
        )
      })
      .catch(() => {
        setNotifications([])
      })
  }, [API_BASE_URL])

  const loadPending = async () => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setPendingError('You are not logged in.')
      setPendingEvents([])
      return
    }

    setPendingStatus('loading')
    setPendingError('')
    try {
      const res = await axios.get(`${API_BASE_URL}/api/events/pending`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setPendingEvents(res.data?.events ?? [])
    } catch (e) {
      setPendingError(
        e?.response?.data?.message ||
          'Unable to load pending events. Please try again.',
      )
      setPendingEvents([])
    } finally {
      setPendingStatus('idle')
    }
  }

  useEffect(() => {
    if (activeTab !== 'approvals') return
    loadPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const approve = async (eventId) => {
    if (!eventId) return
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setPendingError('You are not logged in.')
      return
    }

    setActionBusyById((prev) => ({ ...prev, [eventId]: true }))
    setPendingError('')
    try {
      await axios.post(
        `${API_BASE_URL}/api/events/${eventId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId))
    } catch (e) {
      setPendingError(
        e?.response?.data?.message || 'Failed to approve event.',
      )
    } finally {
      setActionBusyById((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  const openReject = (event) => {
    setPendingError('')
    setRejectModal({ open: true, event, reason: '' })
  }

  const closeReject = () => {
    setRejectModal({ open: false, event: null, reason: '' })
  }

  const reject = async () => {
    const ev = rejectModal.event
    if (!ev?.id) return
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setPendingError('You are not logged in.')
      return
    }

    const eventId = ev.id
    setActionBusyById((prev) => ({ ...prev, [eventId]: true }))
    setPendingError('')
    try {
      await axios.post(
        `${API_BASE_URL}/api/events/${eventId}/reject`,
        { reason: rejectModal.reason },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId))
      closeReject()
    } catch (e) {
      setPendingError(e?.response?.data?.message || 'Failed to reject event.')
    } finally {
      setActionBusyById((prev) => ({ ...prev, [eventId]: false }))
    }
  }

  const pendingCount = pendingEvents?.length ?? 0
  const pendingList = useMemo(() => pendingEvents || [], [pendingEvents])

  const stats = [
    { label: 'Total Events', value: String(overview.stats.totalEvents ?? 0), icon: Calendar, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Pending Approvals', value: String(overview.stats.pendingApprovals ?? 0), icon: Clock, color: 'bg-orange-50 text-orange-600' },
    { label: 'Approved Events', value: String(overview.stats.approvedEvents ?? 0), icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rejected Events', value: String(overview.stats.rejectedEvents ?? 0), icon: Award, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="h-screen bg-[#F5F5F5] overflow-hidden flex">
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
      {/* Sidebar */}
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
              SLIIT EVENT
            </motion.span>
          )}
          <button
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <item.icon
                size={20}
                className={cn(
                  'shrink-0',
                  activeTab === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600',
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
            <Lock size={20} />
            {isSidebarOpen && (
              <span className="font-medium text-sm">Change password</span>
            )}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-6 md:px-8 z-10">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl w-[22rem] max-w-full border border-black/5">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search events, students..."
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((v) => !v)}
                className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"
                aria-label="Targeted notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white" />
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl border border-black/5 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between bg-slate-50">
                    <p className="text-sm font-bold text-slate-900">Targeted notifications</p>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'px-4 py-3 border-b border-black/5 last:border-b-0',
                          n.read ? 'bg-white' : 'bg-indigo-50/40',
                        )}
                      >
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{n.dateLabel}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-5 border-l border-black/5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.username ?? 'Faculty'}</p>
                <p className="text-xs text-slate-500 capitalize">Faculty Coordinator</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                {user?.username?.charAt(0) ?? 'F'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Faculty Portal
                  </h1>
                  <p className="text-slate-500 mt-1">
                    Monitor academic events and track your professional participation.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <BookOpen size={24} />
                  </div>
                </div>
              </div>

              {/* Faculty Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
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
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                  </motion.div>
                ))}
              </div>

              {/* Event trends + Academic Events */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Event trends</h2>
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
                      <TrendingUp size={14} />
                      +8% vs last term
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overview.trends || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} dot={{ r: 6, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Academic Events</h2>
                  <div className="space-y-6">
                    {MOCK_EVENTS.map((event) => (
                      <div key={event.id} className="group cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase rounded-md">
                            {event.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {event.dateLabel}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-2 group-hover:text-indigo-600 transition-colors">
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {event.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} /> {event.registeredCount} Students
                          </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-bold text-indigo-600">View Details</span>
                          <ChevronRight size={16} className="text-indigo-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="w-full mt-8 py-3 rounded-2xl border border-indigo-100 text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors"
                  >
                    Browse All Academic Events
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Event Approvals
                  </h1>
                  <p className="text-slate-500 mt-1">
                    Review pending events and approve or reject them.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadPending}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-bold"
                  disabled={pendingStatus === 'loading'}
                >
                  {pendingStatus === 'loading' ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    Pending approvals
                  </h2>
                  <span className="text-sm font-semibold text-slate-500">
                    {pendingCount} pending
                  </span>
                </div>

                {pendingError && (
                  <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {pendingError}
                  </div>
                )}

                {pendingStatus === 'loading' && pendingCount === 0 && (
                  <p className="text-sm text-slate-600">Loading…</p>
                )}

                {pendingStatus !== 'loading' && pendingCount === 0 && !pendingError && (
                  <p className="text-sm text-slate-600">
                    No pending events right now.
                  </p>
                )}

                <div className="space-y-4">
                  {pendingList.map((event) => {
                    const busy = Boolean(actionBusyById[event.id])
                    return (
                      <div
                        key={event.id}
                        className="p-4 rounded-2xl border border-black/5 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-md">
                                {event.type}
                              </span>
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold uppercase rounded-md border border-orange-100">
                                pending
                              </span>
                              {event.createdBy?.name && (
                                <span className="text-xs text-slate-400">
                                  Submitted by {event.createdBy.name}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mt-2 truncate">
                              {event.name}
                            </h3>
                            {event.thumbnailUrl && (
                              <img
                                src={event.thumbnailUrl}
                                alt={`${event.name} thumbnail`}
                                className="mt-3 w-full max-w-[520px] h-44 rounded-2xl object-cover border border-black/5 bg-slate-50"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {event.description && (
                              <p className="text-sm text-slate-600 mt-1">
                                {event.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin size={14} /> {event.place}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={14} /> {event.totalSeats} seats
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(event.date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: '2-digit',
                                  year: 'numeric',
                                })}{' '}
                                • {event.time}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => approve(event.id)}
                              disabled={busy}
                              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openReject(event)}
                              disabled={busy}
                              className="px-4 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {rejectModal.open && (
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-3xl shadow-2xl border border-black/5 w-full max-w-xl p-6 md:p-8 relative">
                    <button
                      type="button"
                      onClick={closeReject}
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500"
                      aria-label="Close reject dialog"
                    >
                      <X size={18} />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      Reject event
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                      {rejectModal.event?.name}
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">
                        Reason (optional)
                      </label>
                      <textarea
                        rows={4}
                        value={rejectModal.reason}
                        onChange={(e) =>
                          setRejectModal((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                        placeholder="Explain why this event is rejected…"
                      />
                    </div>
                    <div className="mt-6 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeReject}
                        className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={reject}
                        className="px-5 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={Boolean(actionBusyById[rejectModal.event?.id])}
                      >
                        {actionBusyById[rejectModal.event?.id] ? 'Rejecting…' : 'Reject event'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <FacultyEventsSection />
          )}
        </main>
      </div>
    </div>
  )
}

function FacultyEventsSection() {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

  const [filter, setFilter] = useState('all')
  const [events, setEvents] = useState([])
  const [loadStatus, setLoadStatus] = useState('idle') // idle | loading
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setLoadError('You are not logged in.')
      setEvents([])
      return
    }

    setLoadStatus('loading')
    setLoadError('')
    axios
      .get(`${API_BASE_URL}/api/events/faculty/all`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        const items = res.data?.events ?? []
        setEvents(items)
      })
      .catch((e) => {
        setLoadError(
          e?.response?.data?.message ||
            'Unable to load events from server. Showing sample data.',
        )
        setEvents([])
      })
      .finally(() => setLoadStatus('idle'))
  }, [API_BASE_URL])

  const normalizedEvents = useMemo(() => {
    const source = events?.length ? events : MOCK_EVENTS
    return source.map((e) => {
      // If already in mock format, keep as-is.
      if (e.title && e.category) return e

      const type = e.type === 'work' ? 'workshop' : e.type
      const dateLabel = new Date(e.date).toLocaleDateString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
      return {
        id: e.id,
        title: e.name,
        description: e.description ?? '',
        dateLabel,
        time: e.time,
        location: e.place,
        category: type,
        registeredCount: 0,
        capacity: e.totalSeats,
        image: e.thumbnailUrl || '',
        status: e.status,
      }
    })
  }, [events])

  const filteredEvents =
    filter === 'all'
      ? normalizedEvents
      : normalizedEvents.filter((event) => event.category === filter)

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Discover events</h2>
          <p className="text-sm text-slate-500">
            Explore upcoming SLIIT EVENTs and find something that matches your
            interests.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-black/5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Filter:</span>
          {['all', 'academic', 'workshop', 'sports', 'social'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          {loadError}
        </div>
      )}

      {loadStatus === 'loading' && !events?.length && (
        <p className="text-sm text-slate-600">Loading events…</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event, index) => (
          <motion.article
            key={event.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-[24px] overflow-hidden border border-black/5 shadow-sm hover:shadow-lg hover:shadow-indigo-50 transition-all group"
          >
            <div className="relative h-40 overflow-hidden">
              {event.image ? (
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-slate-100" />
              )}
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/40">
                  {event.category}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {event.title}
              </h3>
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                {event.description}
              </p>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> {event.dateLabel}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" /> {event.time}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" /> {event.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400" /> {event.registeredCount}/
                    {event.capacity}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 w-full py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                View details
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
