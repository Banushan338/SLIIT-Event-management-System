import { motion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthShell } from '@/pages/auth/AuthShell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth, roleHomePath } from '@/context/AuthContext'
import { toast } from '@/hooks/use-toast'

function parseHashParams(hash) {
  if (!hash) return {}
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(trimmed)
  const out = {}
  for (const [k, v] of params.entries()) out[k] = v
  return out
}

export function OAuthCallbackPage() {
  const { completeOAuth } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const hashParams = parseHashParams(window.location.hash)
    const searchParams = new URLSearchParams(window.location.search)
    const token = hashParams.token || searchParams.get('token')
    const refreshToken = hashParams.refresh || searchParams.get('refresh')
    const remoteError =
      hashParams.error || searchParams.get('error') || hashParams.message

    if (remoteError) {
      const msg = decodeURIComponent(remoteError)
      setError(msg)
      toast({ title: 'Sign-in failed', description: msg, variant: 'destructive' })
      return
    }
    if (!token) {
      const msg = 'No OAuth token received.'
      setError(msg)
      toast({ title: 'Sign-in failed', description: msg, variant: 'destructive' })
      return
    }

    completeOAuth({ token, refreshToken })
      .then((user) => {
        const displayName = user?.username || user?.email?.split('@')[0] || 'there'
        toast({
          title: 'Signed in',
          description: `Welcome, ${displayName}! Redirecting…`,
          variant: 'success',
        })
        navigate(roleHomePath(user.role), { replace: true })
      })
      .catch((err) => {
        const msg = err?.message || 'Unable to complete sign in.'
        setError(msg)
        toast({
          title: 'Sign-in failed',
          description: msg,
          variant: 'destructive',
        })
      })
  }, [completeOAuth, navigate])

  return (
    <AuthShell>
      <Card glass className="p-10 text-center">
        {!error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Signing you in…</h1>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Finalizing your authentication. This will only take a moment.
            </p>
          </motion.div>
        ) : (
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Sign-in failed</h1>
            <Alert variant="destructive" className="mt-4 text-left">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button asChild variant="gradient" size="lg" className="mt-6 w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        )}
      </Card>
    </AuthShell>
  )
}
