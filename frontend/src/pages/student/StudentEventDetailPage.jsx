import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { CommentSection } from '@/components/dashboard/CommentSection'
import { EventDetails } from '@/components/dashboard/EventDetails'
import { FeedbackSection } from '@/components/dashboard/FeedbackSection'
import { ReviewSection } from '@/components/dashboard/ReviewSection'
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
  const [summary, setSummary] = useState({ averageRating: null, count: 0 })
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [comments, setComments] = useState([])
  const [commentVisibilityMode, setCommentVisibilityMode] = useState('PUBLIC')
  const [roleVisibility, setRoleVisibility] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [feedbackCategory, setFeedbackCategory] = useState('Other')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackRating, setFeedbackRating] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [eventRes, reviewRes, commentRes] = await Promise.allSettled([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/reviews/${eventId}`),
        api.get(`/api/comments/${eventId}`),
      ])
      if (eventRes.status === 'fulfilled') {
        setEvent(eventRes.value.data?.event || null)
      } else {
        setEvent(null)
      }
      if (reviewRes.status === 'fulfilled') {
        const payload = reviewRes.value.data || {}
        setSummary(payload.summary || { averageRating: null, count: 0 })
        setReviews(payload.reviews || [])
      } else {
        setSummary({ averageRating: null, count: 0 })
        setReviews([])
      }
      setComments(commentRes.status === 'fulfilled' ? (commentRes.value.data?.comments || []) : [])
    } catch {
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [eventId])

  const averageRating = useMemo(() => {
    if (summary?.averageRating != null) return summary.averageRating
    if (!reviews.length) return 0
    return reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
  }, [summary, reviews])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reviewText.trim()) {
      toast({ title: 'Review required', description: 'Please add your review text before submitting.', variant: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/api/reviews', {
        eventId,
        rating: Number(rating),
        reviewText,
      })
      console.debug('Review submit response', res?.status, res?.data)
      toast({
        title: 'Review submitted',
        description: 'Your review has been saved.',
        variant: 'success',
      })
      setReviewText('')
      load()
    } catch (err) {
      console.error('Review submit failed', err?.response?.status, err?.response?.data || err?.message)
      const msg = extractErrorMessage(err)
      toast({
        title: 'Could not submit',
        description: msg.includes('register') || msg.includes('attend') ? 'You must attend event' : msg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const postComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const payload = {
        eventId,
        comment: commentText.trim(),
        visibility: 'PUBLIC',
      }
      await api.post('/api/comments', payload)
      setCommentText('')
      setCommentVisibilityMode('PUBLIC')
      setRoleVisibility([])
      toast({ title: 'Comment posted', description: 'Your comment was added.', variant: 'success' })
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
      toast({ title: 'Message required', description: 'Please enter feedback before submitting.', variant: 'warning' })
      return
    }
    setSubmittingFeedback(true)
    try {
      const res = await api.post('/api/feedback', {
        eventId,
        category: feedbackCategory,
        message: feedbackMessage,
        rating: feedbackRating === '' ? null : Number(feedbackRating),
      })
      console.debug('Feedback submit response', res?.status, res?.data)
      setFeedbackCategory('Other')
      setFeedbackMessage('')
      setFeedbackRating('')
      toast({ title: 'Feedback submitted', description: 'Your private feedback has been sent.', variant: 'success' })
      load()
    } catch (err) {
      console.error('Feedback submit failed', err?.response?.status, err?.response?.data || err?.message)
      const msg = extractErrorMessage(err)
      toast({
        title: 'Could not submit feedback',
        description: msg.includes('register') ? 'You must register for this event' : msg,
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
  const eventEndMs = new Date(event.endTime || event.startTime || event.date).getTime()
  const completedByDate = Number.isFinite(eventEndMs) ? Date.now() > eventEndMs : false
  const isUpcoming = eventStatus === 'upcoming'
  const isCompleted = eventStatus === 'completed' || completedByDate
  const isStudent = String(currentUser?.role || '') === 'student'
  const canReview = registered && isCompleted
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
            toast({ title: 'Registration failed', description: res?.error || 'Unable to register', variant: 'destructive' })
          }
        }}
      />

      {isStudent && canReview ? (
          <ReviewSection
            averageRating={averageRating}
            reviews={reviews}
            rating={rating}
            setRating={setRating}
            reviewText={reviewText}
            setReviewText={setReviewText}
            submitting={submitting}
            canSubmit={canReview}
            onSubmit={handleSubmit}
          />
      ) : null}

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
