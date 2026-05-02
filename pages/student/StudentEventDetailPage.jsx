import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CommentSection } from '@/components/dashboard/CommentSection'
import { EventDetails } from '@/components/dashboard/EventDetails'
import { FeedbackSection } from '@/components/dashboard/FeedbackSection'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { api, extractErrorMessage } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { useOutletContext } from 'react-router-dom'

export function StudentEventDetailPage() {
  const { currentUser } = useAuth()
  const { registrations = {}, registerForEvent } = useOutletContext() || {}
  const { eventId } = useParams()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  const [comments, setComments] = useState([])
  const [commentVisibilityMode, setCommentVisibilityMode] = useState('PUBLIC')
  const [roleVisibility, setRoleVisibility] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [feedbackCategory, setFeedbackCategory] = useState('Other')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackRating, setFeedbackRating] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [eventRes, commentRes] = await Promise.allSettled([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/comments/${eventId}`),
      ])

      if (eventRes.status === 'fulfilled') {
        setEvent(eventRes.value.data?.event || null)
      } else {
        setEvent(null)
      }

      setComments(
        commentRes.status === 'fulfilled'
          ? commentRes.value.data?.comments || []
          : []
      )
    } catch {
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [eventId])

  const postComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setSubmittingComment(true)
    try {
      await api.post('/api/comments', {
        eventId,
        comment: commentText.trim(),
        visibility: 'PUBLIC',
      })

      setCommentText('')
      setCommentVisibilityMode('PUBLIC')
      setRoleVisibility([])

      toast({
        title: 'Comment posted',
        description: 'Your comment was added.',
        variant: 'success',
      })

      load()
    } catch (err) {
      toast({
        title: 'Could not post comment',
        description: extractErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  const submitFeedback = async (e) => {
    e.preventDefault()

    if (!feedbackMessage.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter feedback before submitting.',
        variant: 'warning',
      })
      return
    }

    setSubmittingFeedback(true)
    try {
      await api.post('/api/feedback', {
        eventId,
        category: feedbackCategory,
        message: feedbackMessage,
        rating: feedbackRating === '' ? null : Number(feedbackRating),
      })

      setFeedbackCategory('Other')
      setFeedbackMessage('')
      setFeedbackRating('')

      toast({
        title: 'Feedback submitted',
        description: 'Your private feedback has been sent.',
        variant: 'success',
      })

      load()
    } catch (err) {
      toast({
        title: 'Could not submit feedback',
        description: extractErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold">Event not found</p>
        <Button asChild variant="outline">
          <Link to="/student/browse">Browse events</Link>
        </Button>
      </div>
    )
  }

  const registered = Boolean(registrations[String(eventId)])
  const eventStatus = String(event.status || '').toLowerCase()
  const eventEndMs = new Date(
    event.endTime || event.startTime || event.date
  ).getTime()
  const completedByDate = Number.isFinite(eventEndMs)
    ? Date.now() > eventEndMs
    : false

  const isUpcoming = eventStatus === 'upcoming'
  const isCompleted = eventStatus === 'completed' || completedByDate
  const isStudent = String(currentUser?.role || '') === 'student'

  const canSubmitFeedback = registered && isCompleted

  const visibleComments = comments.filter((c) => {
    const visibility = String(c.visibility || 'PUBLIC').toUpperCase()
    if (visibility === 'PUBLIC') return true

    const role = String(currentUser?.role || '')
    if (['admin', 'superAdmin'].includes(role)) return true

    const allowed = Array.isArray(c.visibleRoles) ? c.visibleRoles : []

    if (visibility === 'ADMIN_ONLY') {
      return ['admin', 'superAdmin', 'organizer', 'facultyCoordinator'].includes(role)
    }

    return allowed.includes(role)
  })

  return (
    <div className="space-y-6">
      <EventDetails
        event={event}
        registered={registered}
        canRegister={isUpcoming && !registered}
        onRegister={async () => {
          const res = await registerForEvent?.(eventId)
          if (res?.ok) {
            toast({ title: 'Registered successfully', variant: 'success' })
            load()
          } else {
            toast({
              title: 'Registration failed',
              description: res?.error || 'Unable to register',
              variant: 'destructive',
            })
          }
        }}
      />

      <CommentSection
        comments={visibleComments}
        commentText={commentText}
        setCommentText={setCommentText}
        visibility={commentVisibilityMode}
        setVisibility={setCommentVisibilityMode}
        roleVisibility={roleVisibility}
        setRoleVisibility={setRoleVisibility}
        allowVisibility={false}
        submitting={submittingComment}
        onSubmit={postComment}
      />

      {isStudent && canSubmitFeedback ? (
        <FeedbackSection
          category={feedbackCategory}
          setCategory={setFeedbackCategory}
          message={feedbackMessage}
          setMessage={setFeedbackMessage}
          rating={feedbackRating}
          setRating={setFeedbackRating}
          submitting={submittingFeedback}
          onSubmit={submitFeedback}
          canSubmit={canSubmitFeedback}
        />
      ) : null}
    </div>
  )
}