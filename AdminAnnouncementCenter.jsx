import { useEffect, useState } from 'react'
import { BellRing, Send } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, extractErrorMessage } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

export function AdminAnnouncementCenter() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetRole, setTargetRole] = useState('all')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState([])

  const loadAnnouncements = async () => {
    try {
      const res = await api.get('/api/announcements')
      setHistory(res.data?.announcements || [])
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill title and message.',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      await api.post('/api/announcements', {
        title,
        message,
        targetRole,
      })

      toast({
        title: 'Announcement published',
        description: 'All selected users were notified.',
        variant: 'success',
      })

      setTitle('')
      setMessage('')
      setTargetRole('all')
      loadAnnouncements()
    } catch (err) {
      toast({
        title: 'Send failed',
        description: extractErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card glass className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <BellRing className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-semibold">System Announcement Center</h2>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Announcement Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title"
            />
          </div>

          <div className="grid gap-2">
            <Label>Announcement Message</Label>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write announcement message..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Target Audience</Label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="organizer">Organizers</SelectItem>
                <SelectItem value="facultyCoordinator">Faculty Coordinators</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="gradient" onClick={handleSend} disabled={sending}>
            <Send className="h-4 w-4" />
            {sending ? 'Publishing...' : 'Publish Announcement'}
          </Button>
        </div>
      </Card>

      <Card glass className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Published Announcement History</h3>

        {history.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No announcements published yet.</p>
        ) : (
          <div className="space-y-4">
            {history.map((a) => (
              <div key={a._id} className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{a.title}</p>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {a.targetRole}
                  </span>
                </div>
                <p className="mt-2 text-sm">{a.message}</p>
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  Published: {formatDate(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}