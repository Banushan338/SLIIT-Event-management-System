import { Star } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { resolveMediaUrl } from '@/lib/api'

export function ReviewSection({
  averageRating = 0,
  reviews = [],
  rating,
  setRating,
  reviewText,
  setReviewText,
  submitting,
  onSubmit,
  canSubmit = true,
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-lg font-semibold">Reviews</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-sm text-amber-300">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {Number(averageRating || 0).toFixed(1)}
        </span>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No reviews yet.</p>
        ) : (
          reviews.map((r, idx) => (
            <div key={r.id || idx} className="rounded-xl border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={resolveMediaUrl(r.user?.profileImage)} />
                  <AvatarFallback>{(r.user?.name || 'U')[0]}</AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">{r.user?.name || 'User'}</p>
                <p className="ml-auto text-xs text-amber-300">{r.rating}/5</p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{r.reviewText || r.comment || '—'}</p>
            </div>
          ))
        )}
      </div>

      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Textarea rows={3} placeholder="Share your review..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} disabled={!canSubmit} />
        <div className="grid gap-2">
          <Label>Rating</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                disabled={!canSubmit}
                className="rounded-md p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-6 w-6 ${
                    Number(rating) >= value
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-[var(--color-muted-foreground)]'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-[var(--color-muted-foreground)]">
              {Number(rating) || 0}/5
            </span>
          </div>
        </div>
        {!canSubmit ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">Only registered users can review completed events.</p>
        ) : null}
        <Button type="submit" className="w-fit" disabled={submitting || !canSubmit}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </form>
    </section>
  )
}
