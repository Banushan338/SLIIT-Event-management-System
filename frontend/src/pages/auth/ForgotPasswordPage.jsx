import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthShell } from '@/pages/auth/AuthShell'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, extractErrorMessage } from '@/lib/api'

function formatMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const STEPS = ['email', 'otp', 'password', 'done']

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  /** `link` = email with secure token (production). `otp` = 6-digit dev / legacy flow. */
  const [resetMode, setResetMode] = useState('link')
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [expiresAtMs, setExpiresAtMs] = useState(null)
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState(null)
  const [tickNow, setTickNow] = useState(() => Date.now())

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (step !== 'otp') return
    const id = setInterval(() => setTickNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [step])

  const otpSecondsLeft =
    expiresAtMs != null ? Math.max(0, Math.floor((expiresAtMs - tickNow) / 1000)) : 0
  const resendSecondsLeft =
    resendAvailableAtMs != null
      ? Math.max(0, Math.ceil((resendAvailableAtMs - tickNow) / 1000))
      : 0

  const handleRequestOtp = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError('Please enter your email.')
      return
    }
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (resetMode === 'link') {
        await api.post('/api/auth/forgot-password', { email: trimmed })
        setStep('linkSent')
        setSuccess(
          'If an account exists, we sent a reset link. Check your inbox and spam folder.',
        )
      } else {
        const res = await api.post('/api/auth/forgot-password-otp', { email: trimmed })
        const { expiresAt, resendAvailableAt } = res.data || {}
        if (expiresAt) setExpiresAtMs(new Date(expiresAt).getTime())
        if (resendAvailableAt)
          setResendAvailableAtMs(new Date(resendAvailableAt).getTime())
        setStep('otp')
        setSuccess(
          'A verification code has been generated. Check your email (or the server terminal in development).',
        )
      }
    } catch (err) {
      const status = err?.response?.status
      const retryAfter = err?.response?.data?.retryAfterSeconds
      if (status === 429 && typeof retryAfter === 'number') {
        setError(`Too many requests. Please try again in ${retryAfter}s.`)
      } else {
        setError(extractErrorMessage(err, 'Unable to start password reset.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndReset = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password-otp', {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
        confirmPassword,
      })
      setStep('done')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to reset password.'))
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = STEPS.indexOf(step === 'linkSent' ? 'email' : step)

  return (
    <AuthShell>
      <Card glass className="p-8 md:p-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
          <span className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5" />
            Reset password
            {step !== 'linkSent' && step !== 'done' && (
              <span className="text-[var(--color-muted-foreground)]">
                • step {Math.min(stepIndex + 1, 3)} of 3
              </span>
            )}
          </span>
          {step === 'email' && (
            <div className="flex gap-2">
              <button
                type="button"
                className={
                  'rounded-lg px-2 py-1 text-[10px] font-bold ' +
                  (resetMode === 'link'
                    ? 'bg-brand-gradient text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]')
                }
                onClick={() => setResetMode('link')}
              >
                Email link
              </button>
              <button
                type="button"
                className={
                  'rounded-lg px-2 py-1 text-[10px] font-bold ' +
                  (resetMode === 'otp'
                    ? 'bg-brand-gradient text-white'
                    : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]')
                }
                onClick={() => setResetMode('otp')}
              >
                OTP code
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-8 flex gap-1">
          {STEPS.slice(0, 3).map((s, i) => {
            const activeIdx =
              step === 'linkSent' ? 1 : step === 'done' ? 2 : stepIndex
            return (
              <div
                key={s}
                className={
                  'h-1 flex-1 rounded-full transition-all duration-500 ' +
                  (i <= activeIdx ? 'bg-brand-gradient' : 'bg-[var(--color-muted)]')
                }
              />
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-2xl font-bold tracking-tight">
                Forgot your password?
              </h1>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                {resetMode === 'link'
                  ? 'We will email you a secure link to reset your password (valid 1 hour).'
                  : 'We will generate a 6-digit code (shown in the server console in development).'}
              </p>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="mt-6 space-y-2">
                <Label htmlFor="reset-email">University email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@sliit.lk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="gradient"
                size="lg"
                className="mt-6 w-full"
                onClick={handleRequestOtp}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  <>
                    {resetMode === 'link' ? 'Send reset link' : 'Send reset code'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {step === 'linkSent' && (
            <motion.div
              key="linkSent"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                {success || 'If an account exists for that address, you will receive a message shortly.'}
              </p>
              <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
                The reset link opens on this site at <span className="font-mono">/reset-password/&lt;token&gt;</span>.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                onClick={() => {
                  setStep('email')
                  setSuccess('')
                }}
              >
                Use a different email
              </Button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-2xl font-bold tracking-tight">Enter the 6-digit code</h1>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                Sent to <span className="font-semibold text-[var(--color-foreground)]">{email}</span>.
                The code expires in{' '}
                <span className="font-mono text-[var(--color-brand-cyan)]">
                  {formatMmSs(otpSecondsLeft)}
                </span>
                .
              </p>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert variant="info" className="mt-4">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6 space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl font-mono tracking-[0.5em]"
                />
              </div>

              <div className="mt-5 space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={handleRequestOtp}
                  disabled={loading || resendSecondsLeft > 0}
                >
                  <RefreshCw className="h-4 w-4" />
                  {resendSecondsLeft > 0
                    ? `Resend in ${resendSecondsLeft}s`
                    : 'Resend code'}
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  size="lg"
                  className="flex-1"
                  onClick={handleVerifyAndReset}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    <>
                      Reset password
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Password reset</h1>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Button
                type="button"
                variant="gradient"
                size="lg"
                className="mt-6 w-full"
                onClick={() => navigate('/login', { replace: true })}
              >
                Back to sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 'done' && step !== 'linkSent' && (
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        )}
      </Card>
    </AuthShell>
  )
}
