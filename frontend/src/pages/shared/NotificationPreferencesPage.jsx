import { Bell, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { api, extractErrorMessage } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

export function NotificationPreferencesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [prefs, setPrefs] = useState({
    email: true,
    inApp: true,
    eventNotifications: true,
    commentNotifications: true,
    moderationNotifications: true,
  })
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await api.get('/api/users/profile')
        const np = res.data?.user?.notificationPreferences || {}
        if (!ignore) {
          setPrefs({
            email: np.email !== false,
            inApp: np.inApp !== false,
            eventNotifications: np.eventNotifications !== false,
            commentNotifications: np.commentNotifications !== false,
            moderationNotifications: np.moderationNotifications !== false,
          })
        }
        const listRes = await api.get('/api/notifications')
        if (!ignore) setNotifications(listRes.data?.notifications || [])
      } catch (err) {
        if (!ignore) setError(extractErrorMessage(err, 'Could not load preferences.'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.patch('/api/notifications/preferences', {
        email: Boolean(prefs.email),
        inApp: Boolean(prefs.inApp),
        eventNotifications: Boolean(prefs.eventNotifications),
        commentNotifications: Boolean(prefs.commentNotifications),
        moderationNotifications: Boolean(prefs.moderationNotifications),
      })
      toast({
        title: 'Preferences updated',
        description: 'Your notification settings have been saved.',
        variant: 'success',
      })
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to save preferences.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleRead = async (id, nextRead) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, { read: nextRead })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: nextRead } : n)))
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to update notification state.'))
    }
  }

  const row = (label, key, help = '') => {
    const enabled = Boolean(prefs[key])
    return (
      <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-colors hover:bg-[var(--color-muted)]/20">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          {help ? <p className="text-xs text-[var(--color-muted-foreground)]">{help}</p> : null}
          <p className="mt-1 text-xs font-medium">
            <span
              className={
                enabled
                  ? 'inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--color-muted-foreground)]'
              }
            >
              {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
          disabled={loading || saving}
          aria-label={label}
        />
      </label>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Notification Preferences"
        description="Choose which alerts you receive and through which channels."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card glass className="p-6 md:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--color-primary)]" />
          <p className="text-sm font-semibold">Delivery options</p>
        </div>
        <Alert className="mb-4">
          <AlertDescription className="text-xs">
            Preferences apply directly to your visible notification feed in real time. Disabled categories are filtered
            from the bell and unread count automatically.
          </AlertDescription>
        </Alert>
        <div className="space-y-3">
          {row('In-app notifications', 'inApp', 'Show alerts in the app notification bell.')}
          {row('Email notifications', 'email', 'Receive updates via email when enabled.')}
          {row('Event notifications', 'eventNotifications', 'Event approvals, updates, and announcements.')}
          {row('Comment notifications', 'commentNotifications', 'New comments added to events you monitor.')}
          {row('Moderation notifications', 'moderationNotifications', 'Comment moderation actions affecting your content.')}
        </div>
        <Button className="mt-5" variant="gradient" onClick={handleSave} disabled={loading || saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </Card>

      <Card glass className="p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">All Notifications</p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await api.post('/api/notifications/read-all')
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
            }}
          >
            Mark all read
          </Button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title || 'Notification'}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleRead(n.id, !n.read)}
                  >
                    {n.read ? 'Mark unread' : 'Mark read'}
                  </Button>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{n.message}</p>
                <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                  {n.category || 'GENERAL'} - {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
