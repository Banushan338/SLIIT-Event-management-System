import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { AuthShell } from '@/pages/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, extractErrorMessage } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

export function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Use at least 6 characters.',
        variant: 'warning',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Type the same password in both fields.',
        variant: 'warning',
      })
      return
    }
    setLoading(true)
    try {
      await api.post(`/api/auth/reset-password/${encodeURIComponent(token)}`, {
        newPassword,
        confirmPassword,
      })
      setDone(true)
      toast({
        title: 'Password updated',
        description: 'You can sign in with your new password.',
        variant: 'success',
      })
    } catch (err) {
      const msg = extractErrorMessage(err, 'Unable to reset password.')
      toast({ title: 'Reset failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <Card glass className="p-8 md:p-10">
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
          <KeyRound className="h-3.5 w-3.5" />
          Set new password
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Password updated</h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              You can now sign in with your new password.
            </p>
            <Button
              type="button"
              variant="gradient"
              size="lg"
              className="mt-6 w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              This link expires after one hour.
            </p>
            <div className="mt-6 space-y-2">
              <Label htmlFor="np">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <Input
                  id="np"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="cp">Confirm password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <Input
                  id="cp"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button type="submit" variant="gradient" size="lg" className="mt-6 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Update password
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            Back to sign in
          </Link>
        </div>
      </Card>
    </AuthShell>
  )
}
