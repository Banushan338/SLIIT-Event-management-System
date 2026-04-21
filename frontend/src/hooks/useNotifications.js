import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

import { api, API_BASE_URL } from '@/lib/api'

function relTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (Number.isNaN(diff)) return ''
  const sec = Math.round(diff / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  if (sec < 45) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 7) return `${day}d ago`
  return d.toLocaleString()
}

/**
 * Loads in-app notifications for the signed-in user and supports mark-all-read.
 */
export function useNotifications(pollMs = 60000) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications')
      const rows = res.data?.notifications ?? []
      setNotifications(
        rows.map((n) => ({
          id: n.id,
          type: n.type === 'warning' ? 'reminder' : n.type,
          title: n.title || 'Notification',
          message: n.message,
          fullMessage: n.message,
          time: relTime(n.createdAt),
          read: n.read,
          createdAt: n.createdAt,
          eventId: n.eventId || null,
          category: n.category || '',
        })),
      )
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, pollMs)
    return () => clearInterval(t)
  }, [refresh, pollMs])

  useEffect(() => {
    let userId = ''
    try {
      const raw = localStorage.getItem('currentUser')
      const parsed = raw ? JSON.parse(raw) : null
      userId = parsed?.id || ''
    } catch {
      userId = ''
    }
    if (!userId) return undefined

    const socket = io(API_BASE_URL, { transports: ['polling', 'websocket'] })
    socket.on('connect', () => {
      socket.emit('auth:bind-user', userId)
    })
    socket.on('notification:new', () => {
      refresh()
    })
    return () => {
      socket.disconnect()
    }
  }, [refresh])

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/api/notifications/read-all')
      await refresh()
    } catch {
      /* ignore */
    }
  }, [refresh])

  const markRead = useCallback(async (id) => {
    if (!id) return
    try {
      await api.patch('/api/notifications/read', { id })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch {
      // ignore
    }
  }, [])

  return { notifications, loading, refresh, markAllRead, markRead }
}
