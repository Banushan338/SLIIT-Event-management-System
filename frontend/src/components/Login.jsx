import { useEffect, useState } from 'react'
import axios from 'axios'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
} from 'lucide-react'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function formatMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function Login({ onLogin, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [flow, setFlow] = useState('login')
  const [recoverStep, setRecoverStep] = useState('email')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [expiresAtMs, setExpiresAtMs] = useState(null)
  const [resendAvailableAtMs, setResendAvailableAtMs] = useState(null)
  const [tickNow, setTickNow] = useState(() => Date.now())

  const [recoverError, setRecoverError] = useState('')
  const [recoverSuccess, setRecoverSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (flow !== 'recover' || recoverStep !== 'otp') return
    const id = setInterval(() => setTickNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [flow, recoverStep])

  const otpSecondsLeft =
    expiresAtMs != null
      ? Math.max(0, Math.floor((expiresAtMs - tickNow) / 1000))
      : 0
  const resendSecondsLeft =
    resendAvailableAtMs != null
      ? Math.max(0, Math.ceil((resendAvailableAtMs - tickNow) / 1000))
      : 0

  const resetRecoverFlow = () => {
    setFlow('login')
    setRecoverStep('email')
    setRecoveryEmail('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setExpiresAtMs(null)
    setResendAvailableAtMs(null)
    setRecoverError('')
    setRecoverSuccess('')
  }

  const handleRequestOtp = async () => {
    const trimmed = recoveryEmail.trim().toLowerCase()
    if (!trimmed) {
      setRecoverError('Please enter your email.')
      return
    }
    setRecoverError('')
    setRecoverSuccess('')
    setLoading(true)
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/forgot-password`,
        { email: trimmed },
        { headers: { 'Content-Type': 'application/json' } },
      )
      const { expiresAt, resendAvailableAt } = res.data || {}
      if (expiresAt) setExpiresAtMs(new Date(expiresAt).getTime())
      if (resendAvailableAt)
        setResendAvailableAtMs(new Date(resendAvailableAt).getTime())
      setRecoverStep('otp')
      setRecoverSuccess(
        'A verification code was generated. In development, check the server terminal for the OTP.',
      )
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Unable to send code. Try again.'
      const retryAfter = err?.response?.data?.retryAfterSeconds
      if (err?.response?.status === 429 && retryAfter != null) {
        setRecoverError(
          `${msg} Try again in ${formatMmSs(retryAfter)} (${retryAfter}s).`,
        )
      } else {
        setRecoverError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendSecondsLeft > 0) return
    setRecoverError('')
    setRecoverSuccess('')
    setLoading(true)
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/forgot-password`,
        { email: recoveryEmail.trim().toLowerCase() },
        { headers: { 'Content-Type': 'application/json' } },
      )
      const { expiresAt, resendAvailableAt } = res.data || {}
      if (expiresAt) setExpiresAtMs(new Date(expiresAt).getTime())
      if (resendAvailableAt)
        setResendAvailableAtMs(new Date(resendAvailableAt).getTime())
      setRecoverSuccess('New code sent. Check the server terminal for the OTP.')
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Unable to resend code.'
      const retryAfter = err?.response?.data?.retryAfterSeconds
      if (err?.response?.status === 429 && retryAfter != null) {
        setResendAvailableAtMs(Date.now() + retryAfter * 1000)
        setRecoverError(
          `${msg} Wait ${formatMmSs(retryAfter)} (${retryAfter}s) before resending.`,
        )
      } else {
        setRecoverError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpContinue = () => {
    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setRecoverError('Enter the 6-digit code from the terminal.')
      return
    }
    if (otpSecondsLeft <= 0) {
      setRecoverError('This code has expired. Resend a new code.')
      return
    }
    setRecoverError('')
    setRecoverStep('password')
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setRecoverError('')
    if (newPassword !== confirmPassword) {
      setRecoverError('New password and confirm password do not match.')
      return
    }
    if (newPassword.length < 6) {
      setRecoverError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await axios.post(
        `${API_BASE_URL}/api/auth/reset-password-otp`,
        {
          email: recoveryEmail.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        },
        { headers: { 'Content-Type': 'application/json' } },
      )
      setRecoverSuccess('Password updated. You can sign in with your new password.')
      setTimeout(() => {
        resetRecoverFlow()
        setEmail(recoveryEmail.trim().toLowerCase())
      }, 2000)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Unable to reset password.'
      setRecoverError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onLogin(email, password)
  }

  if (flow === 'recover') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-indigo-100 p-10 border border-black/5"
        >
          <button
            type="button"
            onClick={() => {
              resetRecoverFlow()
            }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 mb-6"
          >
            <ArrowLeft size={18} />
            Back to login
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
              <KeyRound size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
              Reset password
            </h1>
            <p className="text-slate-500 mt-2 text-center text-sm">
              Works for all account types (student, organizer, faculty, admin).
            </p>
          </div>

          {recoverStep === 'email' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  Account email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-black/5 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all"
                    required
                  />
                </div>
              </div>
              <div className="min-h-[3rem]">
                {recoverError && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                    {recoverError}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleRequestOtp}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send verification code'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </div>
          )}

          {recoverStep === 'otp' && (
            <div className="space-y-6">
              <p className="text-sm text-slate-600 text-center">
                Code sent for{' '}
                <span className="font-semibold text-slate-900">
                  {recoveryEmail}
                </span>
              </p>

              <div className="rounded-2xl bg-slate-50 border border-black/5 px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Code expires in</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {formatMmSs(otpSecondsLeft)} ({otpSecondsLeft}s)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Resend available in</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {resendSecondsLeft > 0
                      ? `${formatMmSs(resendSecondsLeft)} (${resendSecondsLeft}s)`
                      : 'Now'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-black/5 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all text-center text-xl tracking-[0.4em] font-mono"
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  disabled={resendSecondsLeft > 0 || loading}
                  onClick={handleResendOtp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-indigo-100 text-indigo-700 text-sm font-bold hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <RefreshCw size={16} />
                  Resend code
                </button>
              </div>

              <div className="min-h-[3rem]">
                {recoverSuccess && (
                  <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                    {recoverSuccess}
                  </p>
                )}
                {recoverError && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                    {recoverError}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={loading || otpSecondsLeft <= 0}
                onClick={handleOtpContinue}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-60"
              >
                Continue to new password
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {recoverStep === 'password' && (
            <form onSubmit={handleResetSubmit} className="space-y-6">
              <p className="text-sm text-slate-600 text-center">
                Choose a new password for{' '}
                <span className="font-semibold text-slate-900">
                  {recoveryEmail}
                </span>
              </p>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  New password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-black/5 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-black/5 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="min-h-[3rem]">
                {recoverSuccess && (
                  <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                    {recoverSuccess}
                  </p>
                )}
                {recoverError && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                    {recoverError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRecoverStep('otp')
                    setRecoverError('')
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-indigo-100 p-10 border border-black/5"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            SLIIT EVENTs
          </h1>
          <p className="text-slate-500 mt-2 text-center">
            Welcome back, please login to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">
              University email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. student@uni.edu"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-black/5 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-black/5 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all"
                required
              />
            </div>
          </div>

          {/* Reserve space so layout doesn't jump when error appears */}
          <div className="min-h-[3rem]">
            {error && (
              <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
          >
            Sign In
            <ArrowRight size={20} />
          </button>

          <div className="flex justify-center">
            <button
              type="button"
              className="text-sm font-medium text-indigo-600 hover:underline"
              onClick={() => {
                setFlow('recover')
                setRecoverStep('email')
                setRecoverError('')
                setRecoverSuccess('')
                setRecoveryEmail(email.trim())
              }}
            >
              Forgot password?
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
