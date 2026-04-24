import { motion } from 'framer-motion'
import {
  BadgeCheck,
  Building2,
  Camera,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { PageHeader } from '@/components/common/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import { api, extractErrorMessage, resolveMediaUrl } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

function roleLabel(role) {
  if (role === 'facultyCoordinator') return 'Faculty'
  if (role === 'superAdmin') return 'Admin'
  if (role) return role.charAt(0).toUpperCase() + role.slice(1)
  return 'User'
}

function statusVariant(status) {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'destructive'
  return 'warning'
}

function formatAddress(address) {
  const parts = [address?.line1, address?.city, address?.district].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

function sanitizePhoneInput(value) {
  return value.replace(/[^\d+\-()\s]/g, '')
}

export function ProfilePage() {
  const { persistSession } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: { line1: '', city: '', district: '' },
    bio: '',
  })
  const [editing, setEditing] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadProfile = async () => {
    const res = await api.get('/api/users/me')
    const u = res.data?.user
    if (!u) return
    setProfile(u)
    setForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      address: {
        line1: u.address?.line1 || '',
        city: u.address?.city || '',
        district: u.address?.district || '',
      },
      bio: u.bio || '',
    })
    setPreviewUrl('')
    setSelectedImageFile(null)
  }

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        await loadProfile()
      } catch (err) {
        if (!ignore) setError(extractErrorMessage(err, 'Could not load profile.'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const roleSpecificRows = useMemo(() => {
    if (!profile) return []
    const rp = profile.roleProfile || {}
    if (profile.role === 'student') {
      return [
        { label: 'Registration Number', value: profile.registrationNumber || '—' },
        { label: 'Course', value: rp.course || '—' },
      ]
    }
    if (profile.role === 'organizer') {
      return [
        { label: 'Organization Name', value: rp.organizationName || '—' },
        { label: 'Experience Level', value: rp.experienceLevel || '—' },
      ]
    }
    if (profile.role === 'facultyCoordinator') {
      return [
        { label: 'Department', value: profile.department || '—' },
        { label: 'Designation', value: rp.designation || '—' },
      ]
    }
    return [
      { label: 'Department', value: profile.department || '—' },
      { label: 'Staff ID', value: profile.staffId || '—' },
    ]
  }, [profile])

  const onPickImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setSelectedImageFile(file)
    setPreviewUrl(objectUrl)
  }

  const onCancel = () => {
    if (!profile) return
    setEditing(false)
    setError('')
    setForm({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      address: {
        line1: profile.address?.line1 || '',
        city: profile.address?.city || '',
        district: profile.address?.district || '',
      },
      bio: profile.bio || '',
    })
    setSelectedImageFile(null)
    setPreviewUrl('')
  }

  const onSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Full name is required.')
      return
    }
    if (form.phone && !/^\+?[0-9\s\-()]{7,20}$/.test(form.phone)) {
      setError('Phone number format is invalid.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const updatedRes = await api.put('/api/users/me', {
        name: form.name.trim(),
        email: form.email,
        phone: form.phone.trim(),
        address: {
          line1: form.address.line1.trim(),
          city: form.address.city.trim(),
          district: form.address.district.trim(),
        },
        bio: form.bio.trim(),
      })

      let latestUser = updatedRes.data?.user || null
      if (selectedImageFile) {
        const fd = new FormData()
        fd.append('image', selectedImageFile)
        const imgRes = await api.put('/api/users/upload-image', fd)
        latestUser = imgRes.data?.user || latestUser
      }

      if (latestUser) {
        const token = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        persistSession({ token, refreshToken, user: latestUser })
      }

      await loadProfile()
      setEditing(false)
      toast({
        title: 'Profile updated',
        description: 'Your profile details were saved successfully.',
        variant: 'success',
      })
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to update profile.'))
    } finally {
      setSaving(false)
    }
  }

  const avatar = previewUrl || resolveMediaUrl(profile?.profileImage)

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Professional Profile"
        description="Manage your profile information and keep your account details up to date."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card glass className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/40">
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-[var(--color-muted-foreground)]" />
                  )}
                </div>
                {editing ? (
                  <label className="absolute -bottom-2 -right-2 cursor-pointer">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                      <Camera className="h-4 w-4" />
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  </label>
                ) : null}
              </div>

              <p className="mt-4 text-base font-semibold">{profile?.name || 'User'}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Badge variant="info">{roleLabel(profile?.role)}</Badge>
                <Badge variant={statusVariant(profile?.status)}>{profile?.status || 'active'}</Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        <Card glass className="p-6 md:p-8">
          {!editing ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field icon={<Mail className="h-4 w-4" />} label="Email" value={profile?.email || '—'} />
                <Field icon={<Phone className="h-4 w-4" />} label="Phone Number" value={profile?.phone || '—'} />
                <Field icon={<MapPin className="h-4 w-4" />} label="Address" value={formatAddress(profile?.address)} />
                <Field icon={<Building2 className="h-4 w-4" />} label="Department" value={profile?.department || '—'} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {roleSpecificRows.map((row) => (
                  <Field key={row.label} icon={<IdCard className="h-4 w-4" />} label={row.label} value={row.value} />
                ))}
              </div>

              <Field icon={<BadgeCheck className="h-4 w-4" />} label="Bio" value={profile?.bio || '—'} />

              <Button variant="gradient" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit profile
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSave}>
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email (immutable)</Label>
                <Input id="email" type="email" value={form.email} disabled />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))
                  }
                  placeholder="+94 77 123 4567"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="line1">Address Line 1</Label>
                  <Input
                    id="line1"
                    value={form.address.line1}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, address: { ...p.address, line1: e.target.value } }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.address.city}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, address: { ...p.address, city: e.target.value } }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={form.address.district}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, address: { ...p.address, district: e.target.value } }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Write a short description about yourself..."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="gradient" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

function Field({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
