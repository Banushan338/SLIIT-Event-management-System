import { Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function CommentSection({
  comments = [],
  commentText,
  setCommentText,
  visibility,
  setVisibility,
  roleVisibility = [],
  setRoleVisibility,
  allowVisibility = true,
  submitting,
  onSubmit,
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/70 p-5">
      <h3 className="text-lg font-semibold">Comments</h3>

      <div className="mt-4 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{c.user?.name || 'User'}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(c.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-2 text-sm">{c.comment}</p>
            </div>
          ))
        )}
      </div>

      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Textarea rows={3} placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
        <div className="flex flex-wrap items-end gap-3">
          {allowVisibility ? (
            <div className="min-w-[220px]">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="ADMIN_ONLY">Admin only</SelectItem>
                  <SelectItem value="ROLE_BASED">Role based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button type="submit" disabled={submitting}>
            <Send className="h-4 w-4" />
            {submitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
        {allowVisibility && visibility === 'ROLE_BASED' ? (
          <div className="grid min-w-[260px] gap-2 rounded-xl border border-[var(--color-border)] p-3 text-sm">
            <p className="font-medium">Visible roles</p>
            {[
              { id: 'student', label: 'Student' },
              { id: 'facultyCoordinator', label: 'Faculty' },
              { id: 'organizer', label: 'Organizer' },
              { id: 'admin', label: 'Admin' },
            ].map((r) => (
              <label key={r.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={roleVisibility.includes(r.id)}
                  onChange={(e) => {
                    if (!setRoleVisibility) return
                    setRoleVisibility((prev) =>
                      e.target.checked
                        ? [...new Set([...(prev || []), r.id])]
                        : (prev || []).filter((x) => x !== r.id),
                    )
                  }}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        ) : null}
      </form>
    </section>
  )
}
