import { useMemo, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, extractErrorMessage } from '@/lib/api'

export function ChangePasswordModal({ open = true, onClose }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canSubmit = useMemo(() => {
    if (status === 'saving') return false
    return Boolean(oldPassword && newPassword && confirmPassword)
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
    setStatus('saving')
    try {
      await api.put('/api/auth/change-password', {
        oldPassword,
        newPassword,
        confirmPassword,
      })
      setSuccess('Password updated successfully.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to update password.'))
    } finally {
      setStatus('idle')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient shadow-glow">
              <KeyRound className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Change password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="old-password">Current password</Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={status === 'saving'}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={!canSubmit}>
              {status === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
