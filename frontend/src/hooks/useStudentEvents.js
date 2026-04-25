import { useCallback, useEffect, useMemo, useState } from 'react'

import { api, extractErrorMessage } from '@/lib/api'

function normalizeEvent(event) {
  return {
    ...event,
    id: event?.id || event?._id,
    name: event?.name || event?.title || 'Untitled event',
    place: event?.place || event?.location || 'TBD',
    date: event?.date || event?.startTime || null,
  }
}

export function useStudentEvents() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [approvedRes, regRes] = await Promise.allSettled([
        api.get('/api/events/approved'),
        api.get('/api/events/student/registrations'),
      ])

      const approvedEvents =
        approvedRes.status === 'fulfilled'
          ? (approvedRes.value.data?.events || []).map(normalizeEvent)
          : []
      const registeredEvents =
        regRes.status === 'fulfilled'
          ? (regRes.value.data?.events || []).map(normalizeEvent)
          : []

      const byId = new Map()
      for (const event of approvedEvents) byId.set(String(event.id), event)
      for (const event of registeredEvents) {
        const key = String(event.id)
        byId.set(key, { ...byId.get(key), ...event })
      }

      setEvents([...byId.values()])

      const regMap = {}
      for (const event of registeredEvents) {
        regMap[String(event.id)] = {
          eventId: String(event.id),
          attended: String(event.status || '').toLowerCase() === 'completed',
        }
      }
      setRegistrations(regMap)
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load student events.'))
      setEvents([])
      setRegistrations({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const registerForEvent = useCallback(
    async (eventId) => {
      try {
        await api.post(`/api/events/${eventId}/register`, {})
        await load()
        return { ok: true }
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err, 'Unable to register for event.') }
      }
    },
    [load],
  )

  const deleteTicket = useCallback(
    async (eventId) => {
      try {
        await api.delete(`/api/events/${eventId}/register`)
        await load()
        return { ok: true }
      } catch (err) {
        return { ok: false, error: extractErrorMessage(err, 'Unable to delete ticket.') }
      }
    },
    [load],
  )

  return useMemo(
    () => ({
      events,
      registrations,
      loading,
      error,
      refresh: load,
      registerForEvent,
      deleteTicket,
    }),
    [events, registrations, loading, error, load, registerForEvent, deleteTicket],
  )
}
