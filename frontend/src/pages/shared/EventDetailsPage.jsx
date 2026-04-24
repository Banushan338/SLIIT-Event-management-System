import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { CommentSection } from '@/components/dashboard/CommentSection'
import { EventDetails } from '@/components/dashboard/EventDetails'
import { FeedbackSection } from '@/components/dashboard/FeedbackSection'
import { ReviewSection } from '@/components/dashboard/ReviewSection'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/use-toast'
import { api, extractErrorMessage } from '@/lib/api'

export function EventDetailsPage() {
  const { currentUser } = useAuth()
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [reviews, setReviews] = useState([])
  const [comments, setComments] = useState([])
  const [registered, setRegistered] = useState(false)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [commentText, setCommentText] = useState('')
  const [visibility, setVisibility] = useState('PUBLIC')
  const [loading, setLoading] = useState(true)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackCategory, setFeedbackCategory] = useState('Other')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackRating, setFeedbackRating] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const role = String(currentUser?.role || '')
      const canViewPrivateFeedbackByRole = ['admin', 'superAdmin', 'organizer'].includes(role)
      const [eventRes, reviewRes, commentRes] = await Promise.allSettled([
        api.get(`/api/events/${eventId}`),
        api.get(`/api/reviews/${eventId}`),
        api.get(`/api/comments/${eventId}`),
      ])
      if (eventRes.status === 'fulfilled') setEvent(eventRes.value.data?.event || null)
      const loadedEvent = eventRes.status === 'fulfilled' ? (eventRes.value.data?.event || null) : null
      if (reviewRes.status === 'fulfilled') {
        const payload = reviewRes.value.data || {}
        setReviews(payload.reviews || payload.feedbacks || [])
      } else {
        setReviews([])
      }
      if (commentRes.status === 'fulfilled') setComments(commentRes.value.data?.comments || [])
      else setComments([])
      const isOwnerOrganizer =
        role === 'organizer' &&
        String(loadedEvent?.organizerId || loadedEvent?.organizer?.id || '') === String(currentUser?.id || '')
      const canViewPrivateFeedback = role === 'admin' || role === 'superAdmin' || isOwnerOrganizer
      if (canViewPrivateFeedback) {
        try {
          const feedbackRes = await api.get(`/api/feedback/${eventId}`)
          setFeedbacks(feedbackRes.data?.feedbacks || [])
        } catch {
          setFeedbacks([])
        }
      } else {
        setFeedbacks([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [eventId, currentUser?.role])

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0
    return reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
  }, [reviews])
  const isStudent = String(currentUser?.role || '') === 'student'
  const role = String(currentUser?.role || '')
  const canViewPrivateFeedback = ['admin', 'superAdmin', 'organizer'].includes(role)
  const isCompleted = String(event?.status || '').toLowerCase() === 'completed'
  const canSubmitFeedback = isStudent && registered && isCompleted

  const register = async () => {
    try {
      await api.post(`/api/events/${eventId}/register`, {})
      setRegistered(true)
      toast({ title: 'Registered successfully', variant: 'success' })
    } catch (err) {
      toast({ title: 'Registration failed', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setSubmittingReview(true)
    try {
      await api.post('/api/reviews', { eventId, rating: Number(rating), reviewText })
      setReviewText('')
      toast({ title: 'Review submitted', variant: 'success' })
      load()
    } catch (err) {
      toast({ title: 'Review failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setSubmittingReview(false)
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      await api.post('/api/comments', { eventId, comment: commentText.trim(), visibility })
      setCommentText('')
      toast({ title: 'Comment posted', variant: 'success' })
      load()
    } catch (err) {
      toast({ title: 'Comment failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setSubmittingComment(false)
    }
  }

  const submitFeedback = async (e) => {
    e.preventDefault()
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
      toast({ title: 'Feedback submitted', variant: 'success' })
    } catch (err) {
      toast({ title: 'Feedback failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-muted-foreground)]">Loading details...</p>
  if (!event) return <p className="text-sm text-[var(--color-muted-foreground)]">Event not found.</p>

  return (
    <div className="space-y-5">
      <EventDetails event={event} registered={registered} onRegister={register} />
      <CommentSection
        comments={comments}
        commentText={commentText}
        setCommentText={setCommentText}
        visibility={visibility}
        setVisibility={setVisibility}
        submitting={submittingComment}
        onSubmit={submitComment}
      />
      {isStudent ? (
        <ReviewSection
          averageRating={averageRating}
          reviews={reviews}
          rating={rating}
          setRating={setRating}
          reviewText={reviewText}
          setReviewText={setReviewText}
          submitting={submittingReview}
          onSubmit={submitReview}
        />
      ) : null}
      {isStudent || canViewPrivateFeedback ? (
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
          showList={canViewPrivateFeedback}
          feedbacks={feedbacks}
        />
      ) : null}
    </div>
  )
}
