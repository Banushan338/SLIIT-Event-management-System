import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import axios from 'axios'
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Lock,
  MapPin,
  Menu,
  QrCode,
  Search,
  X,
  Users,
  ArrowRight,
  LogOut,
  Download,
  Share2,
  Info,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { ChangePasswordModal } from '../../components/ChangePasswordModal.jsx'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const FALLBACK_NOW = new Date('2026-05-13T12:00:00')

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
    image: 'https://picsum.photos/seed/ai-2026/800/400',
  },
  {
    id: 'e2',
    title: 'Annual Sports Meet',
    description: 'Cheer for your faculty and join friendly competitions.',
    dateLabel: 'Jun 02, 2026',
    time: '08:00 AM',
    location: 'Main Stadium',
    category: 'sports',
    registeredCount: 200,
    capacity: 500,
    image: 'https://picsum.photos/seed/sports-2026/800/400',
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
    image: 'https://picsum.photos/seed/research-2026/800/400',
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
    image: 'https://picsum.photos/seed/code-lab/800/400',
  },
  {
    id: 'e5',
    title: 'Career Fair 2026',
    description: 'Meet recruiters, get CV feedback, and discover internships.',
    dateLabel: 'Jun 05, 2026',
    time: '09:30 AM',
    location: 'Auditorium',
    category: 'social',
    registeredCount: 420,
    capacity: 900,
    image: 'https://picsum.photos/seed/career-fair/800/400',
  },
  {
    id: 'e6',
    title: 'Design Meetup: UI/UX Critique Night',
    description: 'Bring your portfolio—get actionable feedback from peers.',
    dateLabel: 'Jun 08, 2026',
    time: '06:00 PM',
    location: 'Creative Studio',
    category: 'social',
    registeredCount: 58,
    capacity: 90,
    image: 'https://picsum.photos/seed/design-ux/800/400',
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
    image: 'https://picsum.photos/seed/math-olympiad/800/400',
  },
  {
    id: 'e8',
    title: 'Inter-Faculty Badminton Cup',
    description: 'Register your team and play for your faculty.',
    dateLabel: 'Jun 18, 2026',
    time: '04:00 PM',
    location: 'Indoor Sports Complex',
    category: 'sports',
    registeredCount: 144,
    capacity: 240,
    image: 'https://picsum.photos/seed/badminton/800/400',
  },
  {
    id: 'e9',
    title: 'Open Mic + Acoustic Night',
    description: 'Sing, play, or just chill—student talents on stage.',
    dateLabel: 'Jun 22, 2026',
    time: '07:30 PM',
    location: 'Student Center Courtyard',
    category: 'social',
    registeredCount: 210,
    capacity: 350,
    image: 'https://picsum.photos/seed/open-mic/800/400',
  },
]

function useStudentEventsData() {
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
      .get(`${API_BASE_URL}/api/events/approved`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        const apiEvents = res.data?.events ?? []
        setEvents(apiEvents)
      })
      .catch((e) => {
        setLoadError(
          e?.response?.data?.message ||
            'Unable to load events from server. Showing sample data.',
        )
        setEvents([])
      })
      .finally(() => setLoadStatus('idle'))
  }, [])

  const normalizedEvents = useMemo(() => {
    const source = events?.length ? events : MOCK_EVENTS
    return source.map((e) => {
      if (e.title && e.category && e.date) return e
      const category = e.type === 'work' ? 'workshop' : e.type
      const dateLabel = new Date(e.date).toLocaleDateString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
      return {
        id: e.id,
        title: e.name,
        description: e.description ?? '',
        date: e.date,
        dateLabel,
        time: e.time,
        location: e.place,
        category,
        registeredCount: 0,
        capacity: e.totalSeats,
        image: e.thumbnailUrl || 'https://picsum.photos/seed/event/800/400',
      }
    })
  }, [events])

  return {
    events: normalizedEvents,
    rawEvents: events,
    loadStatus,
    loadError,
  }
}

export function StudentDashboard({ user, onLogout }) {
  const { events, loadStatus, loadError } = useStudentEventsData()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [registrations, setRegistrations] = useState({})

  const now = useMemo(() => new Date(), [])

  const registeredEvents = useMemo(
    () => events.filter((e) => registrations[e.id]),
    [events, registrations],
  )

  const registeredUpcoming = useMemo(() => {
    const sorted = [...registeredEvents].sort(
      (a, b) => new Date(a.date || a.dateLabel).getTime() - new Date(b.date || b.dateLabel).getTime(),
    )
    return sorted.filter(
      (e) => new Date(e.date || e.dateLabel).getTime() >= now.getTime(),
    )
  }, [registeredEvents, now])

  const attendedEvents = useMemo(
    () =>
      registeredEvents.filter(
        (e) => new Date(e.date || e.dateLabel).getTime() < now.getTime(),
      ),
    [registeredEvents, now],
  )

  const thisWeekUpcoming = useMemo(() => {
    const end = new Date(now)
    end.setDate(end.getDate() + 7)
    return registeredUpcoming.filter((e) => {
      const t = new Date(e.date || e.dateLabel).getTime()
      return t >= now.getTime() && t < end.getTime()
    })
  }, [now, registeredUpcoming])

  const stats = useMemo(
    () => [
      {
        label: 'Registered Events',
        value: String(registeredUpcoming.length),
        icon: Calendar,
        color: 'bg-indigo-50 text-indigo-600',
      },
      {
        label: 'Attended Events',
        value: String(attendedEvents.length),
        icon: CheckCircle2,
        color: 'bg-emerald-50 text-emerald-600',
      },
      {
        label: 'Upcoming This Week',
        value: String(thisWeekUpcoming.length),
        icon: Clock,
        color: 'bg-orange-50 text-orange-600',
      },
    ],
    [attendedEvents.length, registeredUpcoming.length, thisWeekUpcoming.length],
  )

  const notifications = useMemo(
    () => [
      {
        id: 'n1',
        title: 'Event reminder',
        message: 'AI Workshop 2026 starts in 2 hours.',
        dateLabel: 'Today • 08:00',
        read: false,
      },
      {
        id: 'n2',
        title: 'Registration confirmed',
        message: 'You are registered for Annual Sports Meet.',
        dateLabel: 'Yesterday • 17:20',
        read: true,
      },
    ],
    [],
  )

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const sidebarItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'events', label: 'Browse Events', icon: Calendar },
      { id: 'tickets', label: 'My Tickets', icon: QrCode },
    ],
    [],
  )

  // Load registrations from backend so they match server (no local random state)
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      return
    }

    axios
      .get(`${API_BASE_URL}/api/events/student/registrations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        const fromServer = (res.data?.events ?? []).reduce((acc, ev) => {
          if (ev?.id) acc[ev.id] = 1
          return acc
        }, {})

        setRegistrations(fromServer)
      })
      .catch(() => {
        // Keep current state (UI will still show Browse Events)
      })
  }, [API_BASE_URL])

  const handleRegisterForEvent = async (event) => {
    const ok = window.confirm(
      `Are you sure you want to register for "${event.title}"?`,
    )
    if (!ok) return

    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      alert('You are not logged in.')
      return
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/events/${event.id}/register`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      )

      setRegistrations((prev) => {
        const next = {
          ...prev,
          [event.id]: 1,
        }
        return next
      })
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        'Unable to register for this event. Please try again.'
      alert(msg)
    }
  }

  return (
    <div className="h-screen bg-[#F5F5F5] overflow-hidden flex">
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
      {/* Sidebar / Drawer */}
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
              SLIIT EVENTs
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <item.icon
                size={20}
                className={`shrink-0 ${
                  activeTab === item.id
                    ? 'text-indigo-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
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
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-6 md:px-8 z-10">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl w-[22rem] max-w-full border border-black/5">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((v) => !v)}
                className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-black/5 shadow-2xl shadow-indigo-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">
                      Notifications
                    </p>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-black/5 last:border-b-0 ${
                          n.read ? 'bg-white' : 'bg-indigo-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {n.title}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {n.message}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {n.dateLabel}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="mt-1 w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pl-5 border-l border-black/5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {user.username}
                </p>
                <p className="text-xs text-slate-500 capitalize">student</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                {user.username?.charAt(0) ?? 'S'}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Page header (like SLIIT EVENT Pro) */}
          {activeTab === 'dashboard' && (
            <div className="flex items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Student Dashboard
                </h1>
                <p className="text-slate-500 mt-1">Welcome back!</p>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-black/5 shadow-sm">
                <Calendar size={18} className="text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">
                  {now.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && loadError && (
            <div className="mb-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              {loadError}
            </div>
          )}

          {/* Stats only on dashboard */}
          {activeTab === 'dashboard' && (
            <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${stat.color}`}
                  >
                    <stat.icon size={22} />
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
          )}

          {/* Main content per tab */}
          {activeTab === 'dashboard' && (
            <StudentOverviewSection
              registeredUpcoming={registeredUpcoming}
              attendedEvents={attendedEvents}
              thisWeekUpcoming={thisWeekUpcoming}
            />
          )}
          {activeTab === 'events' && (
            <StudentEventsSection
              events={events}
              loadStatus={loadStatus}
              loadError={loadError}
              registrations={registrations}
              onRegister={handleRegisterForEvent}
            />
          )}
          {activeTab === 'tickets' && (
            <StudentTicketsSection user={user} events={registeredEvents} />
          )}
        </main>
      </div>
    </div>
  )
}

function StudentOverviewSection({
  registeredUpcoming,
  attendedEvents,
  thisWeekUpcoming,
}) {
  return (
    <section className="grid grid-cols-1 gap-8">
      {/* Registered / Attended / This Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-7 rounded-[32px] border border-black/5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Registered events
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Your upcoming registrations.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {registeredUpcoming.length}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {registeredUpcoming.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Calendar size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 line-clamp-1">
                    {event.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {event.dateLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {event.location}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {registeredUpcoming.length === 0 && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-black/5 text-sm text-slate-600">
                No upcoming registrations yet. Browse events and register to see
                them here.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-black/5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Attended events
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Events you&apos;ve checked in to.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {attendedEvents.length}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {attendedEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 line-clamp-1">
                    {event.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {event.dateLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {event.location}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {attendedEvents.length === 0 && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-black/5 text-sm text-slate-600">
                No attended events yet. Your check-ins will appear here.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-black/5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">This week</h2>
              <p className="text-sm text-slate-500 mt-1">
                Upcoming events in the next 7 days.
              </p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              {thisWeekUpcoming.length}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {thisWeekUpcoming.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 rounded-2xl border border-black/5 hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                  <Clock size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 line-clamp-1">
                    {event.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {event.dateLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {event.location}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {thisWeekUpcoming.length === 0 && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-black/5 text-sm text-slate-600">
                Nothing scheduled for this week yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function StudentEventsSection({
  events,
  loadStatus,
  loadError,
  registrations,
  onRegister,
}) {
  const [filter, setFilter] = useState('all')
  const normalizedEvents = events?.length ? events : MOCK_EVENTS

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
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
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
                    <Calendar size={14} className="text-slate-400" />{' '}
                    {event.dateLabel}
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
                    <Users size={14} className="text-slate-400" />{' '}
                    {(event.registeredCount || 0) +
                      (registrations?.[event.id] || 0)}
                    /{event.capacity}
                  </span>
                </div>
              </div>
              {(() => {
                const currentRegistrations = registrations?.[event.id] || 0
                const capacity = event.capacity || 0
                const isFull =
                  Number.isFinite(capacity) && capacity > 0
                    ? currentRegistrations >= capacity
                    : false
                const isRegistered = currentRegistrations > 0

                if (isFull) {
                  return (
                    <button
                      type="button"
                      disabled
                      className="mt-4 w-full py-2.5 rounded-2xl border border-slate-100 text-slate-400 text-sm font-bold bg-slate-50 cursor-not-allowed"
                    >
                      Booking full
                    </button>
                  )
                }

                if (isRegistered) {
                  return (
                    <button
                      type="button"
                      disabled
                      className="mt-4 w-full py-2.5 rounded-2xl border border-emerald-100 text-emerald-600 text-sm font-bold bg-emerald-50 cursor-default"
                    >
                      Registered
                    </button>
                  )
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      onRegister?.(event)
                    }}
                    className="mt-4 w-full py-2.5 rounded-2xl border border-indigo-100 text-indigo-600 text-sm font-bold hover:bg-indigo-50 transition-colors"
                  >
                    Register for this event
                  </button>
                )
              })()}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

function StudentTicketsSection({ user, events }) {
  const tickets = useMemo(
    () =>
      (events?.length ? events : []).map((event, idx) => ({
        event,
        id: `TKT-${String(99283 + idx).padStart(5, '0')}-STU`,
        userName: user.username,
        status: 'valid',
      })),
    [user.username],
  )

  const cardRefs = useRef({})

  const downloadTicketPdf = async (ticketId) => {
    const node = cardRefs.current[ticketId]
    if (!node) return

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#FFFFFF',
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgProps = pdf.getImageProperties(dataUrl)
    const imgRatio = imgProps.width / imgProps.height

    const margin = 36
    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - margin * 2

    let renderWidth = maxWidth
    let renderHeight = renderWidth / imgRatio
    if (renderHeight > maxHeight) {
      renderHeight = maxHeight
      renderWidth = renderHeight * imgRatio
    }

    const x = (pageWidth - renderWidth) / 2
    const y = (pageHeight - renderHeight) / 2

    pdf.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight)
    pdf.save(`${ticketId}.pdf`)
  }

  return (
    <section className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          My tickets
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Show your ticket at the entrance. This section mirrors the SLIIT EVENT ticket
          experience.
        </p>
      </div>

      {tickets.map((ticket) => (
        <div key={ticket.id} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Ticket card */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[40px] overflow-hidden border border-black/5 shadow-2xl shadow-indigo-100 flex flex-col"
            ref={(el) => {
              if (el) cardRefs.current[ticket.id] = el
            }}
          >
            <div className="h-40 bg-indigo-600 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10">
                  Confirmed ticket
                </span>
                <h3 className="text-2xl font-bold text-white mt-4 leading-tight">
                  {ticket.event.title}
                </h3>
              </div>
            </div>

            <div className="p-8 flex-1 space-y-8">
              {/* QR */}
              <div className="flex justify-center py-2">
                <div className="p-6 bg-white rounded-[32px] border-2 border-dashed border-indigo-100 flex flex-col items-center">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-black/5 mb-4">
                    <QRCodeSVG
                      value={`ticket:${ticket.id}`}
                      size={180}
                      level="H"
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {ticket.id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Date &amp; time
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {ticket.event.dateLabel}
                  </p>
                  <p className="text-xs text-slate-500">{ticket.event.time}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Location
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {ticket.event.location}
                  </p>
                  <p className="text-xs text-slate-500">Main campus</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Attendee
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {ticket.userName}
                  </p>
                  <p className="text-xs text-slate-500">Student</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Status
                  </p>
                  <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                    <CheckCircle2 size={14} />
                    Valid entry
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-black/5 flex items-center justify-between">
              <button
                onClick={() => downloadTicketPdf(ticket.id)}
                className="flex items-center gap-2 text-slate-600 font-bold text-sm hover:text-indigo-600 transition-colors"
              >
                <Download size={18} /> Save PDF
              </button>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(`ticket:${ticket.id}`)
                }
                className="flex items-center gap-2 text-slate-600 font-bold text-sm hover:text-indigo-600 transition-colors"
              >
                <Share2 size={18} /> Share
              </button>
            </div>
          </motion.div>

          {/* Instructions & Help */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Info size={20} className="text-indigo-600" />
                Entry Instructions
              </h3>
              <ul className="space-y-4">
                {[
                  'Please arrive at least 15 minutes before the event starts.',
                  'Keep your QR code ready on your mobile device.',
                  'This ticket is valid for one-time entry only.',
                  'Make sure your screen brightness is high for scanning.',
                ].map((text, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                      {idx + 1}
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-indigo-600 p-8 rounded-[32px] text-white relative overflow-hidden"
            >
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">Need Help?</h3>
                <p className="text-indigo-100 text-sm mb-6">
                  If you have any issues with your ticket or entry, contact the
                  event organizer.
                </p>
                <button className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-colors">
                  Contact Support
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            </motion.div>
          </div>
        </div>
      ))}
    </section>
  )
}


