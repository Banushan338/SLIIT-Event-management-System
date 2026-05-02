import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AuthShell } from '@/pages/auth/AuthShell'
import { OAuthButtons } from '@/pages/auth/oauth-buttons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, roleHomePath } from '@/context/AuthContext'
import { toast } from '@/hooks/use-toast'

export function LoginPage() {
  const { login, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    if (!email?.trim() || !password) {
      toast({
        title: 'Missing details',
        description: 'Enter your university email and password to continue.',
        variant: 'warning',
      })
      return
    }
    setSubmitting(true)
    try {
      const user = await login(email, password)
      const displayName = user?.username || user?.email?.split('@')[0] || 'there'
      toast({
        title: 'Welcome back',
        description: `Signed in as ${displayName}. Taking you to your dashboard…`,
        variant: 'success',
      })
      const redirectTo = location.state?.from || roleHomePath(user.role)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast({
        title: "Couldn't sign you in",
        description:
          err?.message ||
          'Email or password is incorrect. Try again or reset your password.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <Card glass className="relative overflow-hidden p-8 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Welcome back <span className="text-brand-gradient">to SLIIT Events</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Sign in with your university account to continue.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">University email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@sliit.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-[var(--color-brand-cyan)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <div className="relative my-2 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            Or continue with
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <OAuthButtons disabled={submitting} />

          <p className="pt-2 text-center text-sm text-[var(--color-muted-foreground)]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand-gradient hover:underline"
            >
              Create an account
            </Link>
          </p>
        </form>
      </Card>
    </AuthShell>
  )
}
