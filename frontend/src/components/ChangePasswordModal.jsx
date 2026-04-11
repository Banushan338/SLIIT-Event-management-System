import { useMemo, useState } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export function ChangePasswordModal({ open, onClose }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | saving
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canSubmit = useMemo(() => {
    if (status === 'saving') return false
    if (!oldPassword || !newPassword || !confirmPassword) return false
    return true
  }, [confirmPassword, newPassword, oldPassword, status])

  const close = () => {
    if (status === 'saving') return
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill all fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      return
    }

    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) {
      setError('You are not logged in.')
      return
    }

    setStatus('saving')
    try {
      await axios.put(
        `${API_BASE_URL}/api/auth/change-password`,
        { oldPassword, newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      setSuccess('Password updated successfully.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update password.')
    } finally {
      setStatus('idle')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-black/5 w-full max-w-lg p-6 md:p-8 relative">
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-60"
          aria-label="Close change password dialog"
          disabled={status === 'saving'}
        >
          <X size={18} />
        </button>

        <h2 className="text-2xl font-bold text-slate-900">Change password</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter your current password and choose a new one.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Old password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/5 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
              autoComplete="new-password"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              disabled={status === 'saving'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'saving' ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

