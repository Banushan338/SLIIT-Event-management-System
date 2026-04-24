import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function FeedbackSection({
  category,
  setCategory,
  message,
  setMessage,
  rating,
  setRating,
  submitting,
  onSubmit,
  canSubmit,
  showList = false,
  feedbacks = [],
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/70 p-5">
      <h3 className="text-lg font-semibold">Feedback (Private)</h3>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        Private feedback helps organizers improve future events.
      </p>

      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory} disabled={!canSubmit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Organization">Organization</SelectItem>
              <SelectItem value="Content">Content</SelectItem>
              <SelectItem value="Venue">Venue</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Message</Label>
          <Textarea
            rows={3}
            placeholder="Share your private feedback..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!canSubmit}
          />
        </div>
        <div className="grid gap-2">
          <Label>Rating (Optional)</Label>
          <Select value={String(rating)} onValueChange={(v) => setRating(v === 'none' ? '' : Number(v))} disabled={!canSubmit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No rating</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!canSubmit ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Feedback can be submitted only by registered users after event completion.
          </p>
        ) : null}
        <Button type="submit" className="w-fit" disabled={!canSubmit || submitting}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </form>

      {showList ? (
        <div className="mt-4 space-y-3">
          {feedbacks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No private feedback yet.</p>
          ) : (
            feedbacks.map((f) => (
              <div key={f.id} className="rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{f.user?.name || 'User'}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{f.category}</p>
                </div>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{f.message}</p>
                {f.rating != null ? <p className="mt-2 text-xs text-amber-300">Rating: {f.rating}/5</p> : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}
