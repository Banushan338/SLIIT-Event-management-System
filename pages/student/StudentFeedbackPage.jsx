import { motion } from 'framer-motion'
import { MessageSquareHeart, Send, Sparkles, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { api, extractErrorMessage } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function StudentFeedbackPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/events/student/past-feedback')
      const raw = res.data?.items ?? res.data?.events ?? res.data ?? []
      const list = Array.isArray(raw) ? raw : []
      // API returns { items: [{ event: {...}, feedback }] }; normalize to flat event rows with stable ids
      const normalized = list.map((row, index) => {
        if (row?.event && typeof row.event === 'object') {
          const ev = row.event
          const rawId = ev.id ?? ev._id
          const id = rawId != null ? String(rawId) : `past-feedback-${index}`
          return {
            ...ev,
            id,
            feedback: row.feedback,
            feedbackSubmitted: Boolean(row.feedback),
          }
        }
        const ev = row
        const rawId = ev?.id ?? ev?._id
        const id = rawId != null ? String(rawId) : `past-feedback-${index}`
        return {
          ...ev,
          id,
          feedbackSubmitted: Boolean(ev?.feedbackSubmitted ?? ev?.feedback),
        }
      })
      setItems(normalized)
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load past events.'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (eventId) => {
    const draft = drafts[eventId] || {}
    if (!draft.rating) {
      toast({
        title: 'Rating required',
        description: 'Choose a star rating before submitting your feedback.',
        variant: 'warning',
      })
      return
    }
    setBusyId(eventId)
    try {
      await api.post(`/api/events/${eventId}/feedback`, {
        rating: draft.rating,
        comment: draft.comment || '',
      })
      toast({
        title: 'Feedback submitted',
        description: 'Thanks — your input shapes better events.',
        variant: 'success',
      })
      setItems((prev) =>
        prev.map((e) =>
          String(e.id || e._id) === String(eventId)
            ? { ...e, feedbackSubmitted: true, feedback: { rating: draft.rating, comment: draft.comment } }
            : e,
        ),
      )
      setDrafts((d) => ({ ...d, [eventId]: { rating: 0, comment: '' } }))
    } catch (err) {
      toast({
        title: 'Could not submit',
        description: extractErrorMessage(err, 'Please try again.'),
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your voice matters"
        title="Past Event Feedback & Reviews"
        description="Share your experience of past events you attended. Organizers use your feedback to improve."
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} glass className="p-6">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-3 h-3 w-24" />
              <Skeleton className="mt-5 h-20 w-full" />
              <Skeleton className="mt-3 h-10 w-32" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessageSquareHeart className="h-6 w-6" />}
          title="No events to review"
          description="Once you attend events, they'll appear here for feedback."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((event) => {
            const id = String(event.id || event._id)
            const submitted = event.feedbackSubmitted || Boolean(event.feedback)
            const draft = drafts[id] || { rating: 0, comment: '' }
            return (
              <FeedbackCard
                key={id}
                event={event}
                submitted={submitted}
                draft={draft}
                onChange={(patch) =>
                  setDrafts((d) => ({ ...d, [id]: { ...draft, ...patch } }))
                }
                onSubmit={() => submit(id)}
                busy={busyId === id}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function FeedbackCard({ event, submitted, draft, onChange, onSubmit, busy }) {
  const rating = draft.rating || event?.feedback?.rating || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card glass className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">
              {event.name || event.title}
            </h3>
            {event.date && (
              <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                {new Date(event.date).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
          {submitted && (
            <Badge variant="success">
              <Sparkles className="h-3 w-3" />
              Submitted
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={submitted}
              onClick={() => onChange({ rating: n })}
              className={cn(
                'rounded-md p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed',
              )}
              aria-label={`${n} stars`}
            >
              <Star
                className={cn(
                  'h-6 w-6 transition-colors',
                  n <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-[var(--color-muted-foreground)]',
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          className="mt-4"
          placeholder={
            submitted
              ? event.feedback?.comment || 'No additional comment.'
              : 'Tell us what you liked or what could be better…'
          }
          value={draft.comment}
          onChange={(e) => onChange({ comment: e.target.value })}
          disabled={submitted}
        />

        <div className="mt-4 flex justify-end">
          <Button
            variant="gradient"
            size="sm"
            disabled={submitted || busy || !rating}
            onClick={onSubmit}
          >
            <Send className="h-3.5 w-3.5" />
            {submitted ? 'Thanks!' : busy ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
