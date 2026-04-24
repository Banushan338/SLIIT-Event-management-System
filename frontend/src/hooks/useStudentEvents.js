import { useCallback, useEffect, useState } from 'react'

import { api, extractErrorMessage } from '@/lib/api'
import { MOCK_EVENTS } from '@/data/mockEvents'

const MOCK_EVENT_ID_PREFIX = 'mock-'

function normalizeId(event) {
  if (!event) return null
  const id = event.id || event._id
  return id ? { ...event, id: String(id) } : null
}

function deriveStatus(event) {
  const current = String(event?.status || '').toLowerCase()
  if (current === 'cancelled') return 'cancelled'
  const start = event?.startTime ? new Date(event.startTime) : new Date(event?.date)
  const end = event?.endTime ? new Date(event.endTime) : null
  if (Number.isNaN(start.getTime())) return 'upcoming'
  const now = Date.now()
  if (now < start.getTime()) return 'upcoming'
  if (end && !Number.isNaN(end.getTime()) && now > end.getTime()) return 'completed'
  return 'completed'
}

export function useStudentEvents() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [eventsRes, regsRes] = await Promise.allSettled([
        api.get('/api/events/approved'),
        api.get('/api/events/student/registrations'),
      ])

      if (eventsRes.status === 'fulfilled') {
        const items =
          eventsRes.value?.data?.events || eventsRes.value?.data || []
        const normalized = (Array.isArray(items) ? items : [])
          .map(normalizeId)
          .filter(Boolean)
          .map((e) => ({
            ...e,
            title: e.title || e.name,
            location: e.location || e.place,
            status: deriveStatus(e),
          }))
        setEvents(normalized.length ? normalized : MOCK_EVENTS)
      } else {
        setEvents(MOCK_EVENTS)
        setError(extractErrorMessage(eventsRes.reason, ''))
      }

      if (regsRes.status === 'fulfilled') {
        const data = regsRes.value?.data
        const map = {}

        // Backend returns { events: [...] } (registered events), not { registrations: [...] }
        if (Array.isArray(data?.registrations)) {
          for (const r of data.registrations) {
            const eventId = String(r.eventId || r.event?.id || r.event?._id || '')
            if (!eventId) continue
            map[eventId] = {
              ticketCode: r.ticketCode || r.qrCode || null,
              registeredAt: r.registeredAt || r.createdAt,
              attended: Boolean(r.attended),
              event: r.event ? normalizeId(r.event) : undefined,
            }
          }
        } else if (Array.isArray(data?.events)) {
          for (const ev of data.events) {
            const normalized = normalizeId(ev)
            if (!normalized?.id) continue
            map[normalized.id] = {
              ticketCode: null,
              registeredAt: ev.createdAt,
              attended: false,
              event: normalized,
            }
          }
        } else if (Array.isArray(data?.items)) {
          for (const r of data.items) {
            const eventId = String(r.eventId || r.event?.id || r.event?._id || '')
            if (!eventId) continue
            map[eventId] = {
              ticketCode: r.ticketCode || r.qrCode || null,
              registeredAt: r.registeredAt || r.createdAt,
              attended: Boolean(r.attended),
              event: r.event ? normalizeId(r.event) : undefined,
            }
          }
        }

        setRegistrations(map)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const registerForEvent = useCallback(
    async (eventId) => {
      const normalizedId = String(eventId || '')
      if (normalizedId.startsWith(MOCK_EVENT_ID_PREFIX)) {
        return {
          ok: false,
          code: 400,
          error: 'This is a demo event card. Create/approve a real event first, then register.',
        }
      }
      try {
        const res = await api.post(`/api/events/${normalizedId}/register`, {})
        const reg = res.data?.registration || res.data || {}
        setRegistrations((prev) => ({
          ...prev,
          [normalizedId]: {
            ticketCode: reg.ticketCode || reg.qrCode || null,
            registeredAt: reg.registeredAt || new Date().toISOString(),
            attended: false,
          },
        }))
        return { ok: true }
      } catch (err) {
        const status = err?.response?.status
        if (status === 409) {
          setRegistrations((prev) => ({
            ...prev,
            [normalizedId]: {
              ticketCode: prev[normalizedId]?.ticketCode || null,
              registeredAt:
                prev[normalizedId]?.registeredAt || new Date().toISOString(),
              attended: prev[normalizedId]?.attended ?? false,
            },
          }))
        }
        return {
          ok: false,
          code: status,
          error: extractErrorMessage(err, 'Unable to register.'),
        }
      }
    },
    [],
  )

  return {
    events,
    registrations,
    loading,
    error,
    refresh: fetchEvents,
    registerForEvent,
  }
}
