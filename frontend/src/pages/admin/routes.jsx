import {
  BarChart3,
  Bell,
  ClipboardCheck,
  LayoutDashboard,
  MessageSquare,
  MessageSquareWarning,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DataTable, StatusBadge } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { RoleLayout } from '@/components/common/RoleLayout'
import { StatCard } from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { ProfilePage } from '@/pages/student/ProfilePage'
import { NotificationPreferencesPage } from '@/pages/shared/NotificationPreferencesPage'
import { useNotifications } from '@/hooks/useNotifications'
import { EventManagementPage } from '@/pages/shared/EventManagementPage'
import { EventDetailsPage } from '@/pages/shared/EventDetailsPage'

const navItems = [
  { to: '/admin', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: '/admin/users', label: 'Users & Roles', icon: <Users className="h-4 w-4" /> },
  { to: '/admin/approvals', label: 'Event Approvals', icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: '/admin/events', label: 'Event Tab', icon: <ClipboardCheck className="h-4 w-4" /> },
  { to: '/admin/feedback', label: 'Event Feedback', icon: <MessageSquare className="h-4 w-4" /> },
  { to: '/admin/comments', label: 'Comment Moderation', icon: <MessageSquareWarning className="h-4 w-4" /> },
  { to: '/admin/analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { to: '/admin/security', label: 'Security Logs', icon: <Shield className="h-4 w-4" /> },
  { to: '/admin/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
]

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

function useAdminData() {
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await api.get('/api/admin/feedbacks')
        if (!ignore && res.data?.feedbacks) setFeedbacks(res.data.feedbacks)
      } catch {
        /* keep empty */
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const deleteFeedback = async (id) => {
    await api.delete(`/api/admin/feedbacks/${id}`)
    setFeedbacks((prev) => prev.filter((f) => f.id !== id))
  }

  return { feedbacks, loading, deleteFeedback, setFeedbacks }
}

function AdminOverviewPage() {
  const { adminUsers, feedbacks, loginAttempts } = useOutletContext()
  const failed = loginAttempts.filter((a) => !a.success).length

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Overview" description="Platform health and quick signals." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={adminUsers.length} accent="indigo" />
        <StatCard label="Feedback entries" value={feedbacks.length} accent="teal" />
        <StatCard label="Failed logins (tracked)" value={failed} accent="amber" />
        <StatCard label="Roles" value={new Set(adminUsers.map((u) => u.role)).size} accent="cyan" hint="Distinct roles" />
      </div>
    </div>
  )
}

function AdminUsersPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const {
    adminUsers,
    createUser,
    changeAdminUserRole,
    changeAdminUserStatus,
    deleteAdminUser,
    refreshAdminUsers,
  } = useOutletContext()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'student' })
  const [saving, setSaving] = useState(false)
  const isSuperAdmin = currentUser?.role === 'superAdmin'
  const canManageRow = (row) => {
    if (isSuperAdmin) return true
    return !['admin', 'superAdmin'].includes(row?.role)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (roleFilter !== 'all') params.role = roleFilter
      if (statusFilter !== 'all') params.status = statusFilter
      if (departmentFilter.trim()) params.department = departmentFilter.trim()
      refreshAdminUsers(params)
    }, 250)
    return () => clearTimeout(t)
  }, [search, roleFilter, statusFilter, departmentFilter, refreshAdminUsers])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await createUser({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      })
      if (result?.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({
          title: 'User created',
          description: result?.generatedPassword
            ? `Temporary password: ${result.generatedPassword}`
            : 'The account is ready to use.',
          variant: 'success',
        })
        setDialogOpen(false)
        setForm({ username: '', email: '', password: '', role: 'student' })
      }
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div>
          <div className="font-medium">{row.username}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge variant="outline">{row.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const isSelf = String(row.id) === String(currentUser?.id || '')
            const allowedByRole = canManageRow(row)
            const canChangeRole = allowedByRole && !(isSelf && ['admin', 'superAdmin'].includes(row.role))
            const canChangeStatus = allowedByRole
            const canDeleteUser = allowedByRole && !isSelf && row.role !== 'superAdmin'
            const blockedHint = isSuperAdmin
              ? 'You cannot perform this action for this account.'
              : 'Only super admin can manage admin or super admin accounts.'
            return (
              <>
          <Select
            value={row.role}
            disabled={!canChangeRole}
            onValueChange={async (value) => {
              if (!canChangeRole) {
                toast({
                  title: 'Action blocked',
                  description: blockedHint,
                  variant: 'warning',
                })
                return
              }
              try {
                await changeAdminUserRole(row.id, value)
                toast({ title: 'Role changed', description: `${row.email} -> ${value}`, variant: 'success' })
              } catch (err) {
                toast({ title: 'Role update blocked', description: extractErrorMessage(err), variant: 'destructive' })
              }
            }}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">student</SelectItem>
              <SelectItem value="staff">staff</SelectItem>
              <SelectItem value="facultyCoordinator">facultyCoordinator</SelectItem>
              <SelectItem value="organizer">organizer</SelectItem>
              {isSuperAdmin && <SelectItem value="admin">admin</SelectItem>}
              {isSuperAdmin && <SelectItem value="superAdmin">superAdmin</SelectItem>}
            </SelectContent>
          </Select>
          <Select
            value={row.status || 'active'}
            disabled={!canChangeStatus}
            onValueChange={async (value) => {
              if (!canChangeStatus) {
                toast({
                  title: 'Action blocked',
                  description: blockedHint,
                  variant: 'warning',
                })
                return
              }
              try {
                await changeAdminUserStatus(row.id, value)
                toast({ title: 'Status updated', description: `${row.email} -> ${value}`, variant: 'success' })
              } catch (err) {
                toast({ title: 'Status update failed', description: extractErrorMessage(err), variant: 'destructive' })
              }
            }}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="inactive">inactive</SelectItem>
              <SelectItem value="suspended">suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/users/${row.id}/edit`)}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[var(--color-destructive)]"
            disabled={!canDeleteUser}
            onClick={async () => {
              if (!canDeleteUser) {
                toast({
                  title: 'Delete blocked',
                  description: isSelf ? 'You cannot delete your own account.' : blockedHint,
                  variant: 'warning',
                })
                return
              }
              try {
                await deleteAdminUser(row.id)
                toast({ title: 'User deleted', description: row.email, variant: 'success' })
              } catch (err) {
                toast({ title: 'Delete blocked', description: extractErrorMessage(err), variant: 'destructive' })
              }
            }}
          >
            Delete
          </Button>
              </>
            )
          })()}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Users & roles"
        description="Complete user management with role hierarchy, status controls, and profile editing."
        actions={
          <Button variant="gradient" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
        }
      />
      <Card glass className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/email/registration..." />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="student">student</SelectItem>
              <SelectItem value="staff">staff</SelectItem>
              <SelectItem value="facultyCoordinator">facultyCoordinator</SelectItem>
              <SelectItem value="organizer">organizer</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
              <SelectItem value="superAdmin">superAdmin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="inactive">inactive</SelectItem>
              <SelectItem value="suspended">suspended</SelectItem>
            </SelectContent>
          </Select>
          <Input value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} placeholder="Department filter" />
        </div>
      </Card>
      <Card glass className="p-5">
        <DataTable columns={columns} rows={adminUsers} emptyMessage="No users loaded." />
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>Uses POST /api/admin/users</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={handleCreate}>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Password (optional)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Leave empty for auto-generated"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">student</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                  <SelectItem value="organizer">organizer</SelectItem>
                  <SelectItem value="facultyCoordinator">facultyCoordinator</SelectItem>
                  {isSuperAdmin && <SelectItem value="admin">admin</SelectItem>}
                  {isSuperAdmin && <SelectItem value="superAdmin">superAdmin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" disabled={saving}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminUserEditPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { adminUsers, updateAdminUser, refreshAdminUsers } = useOutletContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshAttempted, setRefreshAttempted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    registrationNumber: '',
    staffId: '',
    address: { line1: '', city: '', district: '' },
    bio: '',
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      const existing = (adminUsers || []).find((u) => String(u.id) === String(id))
      if (!existing) {
        if (!refreshAttempted) {
          setRefreshAttempted(true)
          await refreshAdminUsers()
          return
        }
        if (mounted) {
          toast({ title: 'User not found', description: 'This user record no longer exists.', variant: 'destructive' })
          navigate('/admin/users')
        }
        return
      }
      const row = existing
      if (!mounted) return
      if (!row) {
        toast({ title: 'User not found', description: 'This user record no longer exists.', variant: 'destructive' })
        navigate('/admin/users')
        return
      }
      setForm({
        name: row.name || row.username || '',
        email: row.email || '',
        password: '',
        phone: row.phone || '',
        department: row.department || '',
        registrationNumber: row.registrationNumber || '',
        staffId: row.staffId || '',
        address: {
          line1: row.address?.line1 || '',
          city: row.address?.city || '',
          district: row.address?.district || '',
        },
        bio: row.bio || '',
      })
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [id, adminUsers, refreshAdminUsers, navigate, refreshAttempted])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        department: form.department,
        registrationNumber: form.registrationNumber,
        staffId: form.staffId,
        address: {
          line1: form.address.line1,
          city: form.address.city,
          district: form.address.district,
        },
        bio: form.bio,
      }
      if (form.password.trim()) payload.password = form.password.trim()
      await updateAdminUser(id, payload)
      toast({ title: 'User updated', description: 'Details saved successfully.', variant: 'success' })
      navigate('/admin/users')
    } catch (err) {
      toast({ title: 'Update failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading user profile...</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Edit user profile"
        description="Extended profile management with account, contact, address, and bio fields."
      />
      <Card glass className="p-6 md:p-8">
        <form className="grid gap-4" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid gap-2">
              <Label>Email (immutable)</Label>
              <Input value={form.email} disabled />
            </div>
            <div className="grid gap-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Registration Number</Label>
              <Input value={form.registrationNumber} onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Student ID</Label>
              <Input value={form.staffId} onChange={(e) => setForm((p) => ({ ...p, staffId: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-3">
              <Label>Address Line 1</Label>
              <Input
                value={form.address.line1}
                onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, line1: e.target.value } }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>City</Label>
              <Input
                value={form.address.city}
                onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, city: e.target.value } }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>District</Label>
              <Input
                value={form.address.district}
                onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, district: e.target.value } }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} rows={4} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/users')} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function AdminFeedbackPage() {
  const { feedbacks, deleteFeedback, loading } = useOutletContext()

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Event feedback" description="Moderate student submissions." />
      {loading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
      ) : feedbacks.length ? (
        <div className="grid gap-4">
          {feedbacks.map((f) => (
            <Card key={f.id} glass className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold">{f.event?.name || 'Event'}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {f.student?.name} • {f.student?.email}
                  </p>
                  <p className="mt-2 text-sm">{f.comment || '—'}</p>
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{formatDate(f.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{f.rating}/5</Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-[var(--color-destructive)]"
                    onClick={async () => {
                      try {
                        await deleteFeedback(f.id)
                        toast({
                          title: 'Feedback removed',
                          description: 'The entry has been deleted.',
                          variant: 'success',
                        })
                      } catch (err) {
                        toast({ title: 'Failed', description: extractErrorMessage(err), variant: 'destructive' })
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No feedback" description="Nothing to show yet." />
      )}
    </div>
  )
}

function AdminCommentModerationPage() {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/comments')
      setComments(res.data?.comments || [])
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const updateVisibility = async (id, visibility) => {
    setBusyId(id)
    try {
      await api.patch(`/api/comments/${id}/visibility`, { visibility })
      await load()
      toast({ title: 'Updated', description: 'Comment visibility has been updated.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setBusyId('')
    }
  }

  const toggleHidden = async (id, hidden) => {
    setBusyId(id)
    try {
      await api.patch(`/api/comments/${id}/visibility`, { hidden })
      await load()
      toast({ title: hidden ? 'Comment hidden' : 'Comment visible', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setBusyId('')
    }
  }

  const remove = async (id) => {
    setBusyId(id)
    try {
      await api.delete(`/api/comments/${id}`)
      setComments((prev) => prev.filter((c) => c.id !== id))
      toast({ title: 'Comment deleted', variant: 'success' })
    } catch (err) {
      toast({ title: 'Delete failed', description: extractErrorMessage(err), variant: 'destructive' })
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Comment moderation" description="Override visibility, hide, or delete comments." />
      {loading ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
      ) : comments.length ? (
        <div className="grid gap-4">
          {comments.map((c) => (
            <Card key={c.id} glass className="p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{c.user?.name || 'User'} ({c.user?.role || 'unknown'})</p>
                  <Badge variant={c.hidden ? 'warning' : 'info'}>{c.hidden ? 'Hidden' : c.visibility}</Badge>
                </div>
                <p className="text-sm">{c.comment}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{formatDate(c.createdAt)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => updateVisibility(c.id, 'PUBLIC')}>Public</Button>
                  <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => updateVisibility(c.id, 'ADMIN_ONLY')}>Admin only</Button>
                  <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => toggleHidden(c.id, !c.hidden)}>
                    {c.hidden ? 'Unhide' : 'Hide'}
                  </Button>
                  <Button size="sm" variant="outline" className="text-[var(--color-destructive)]" disabled={busyId === c.id} onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<MessageSquareWarning className="h-6 w-6" />} title="No comments found" description="Nothing to moderate yet." />
      )}
    </div>
  )
}

function AdminApprovalsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectId, setRejectId] = useState(null)
  const [reason, setReason] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/events/faculty/all')
      setRows(res.data?.events || [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const pending = rows.filter((e) => e.status === 'pending')

  const doApprove = async (id) => {
    try {
      await api.post(`/api/events/${id}/approve`, {})
      toast({ title: 'Event approved', description: 'Students have been notified.', variant: 'success' })
      await refresh()
    } catch (err) {
      toast({ title: 'Approval failed', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  const doReject = async () => {
    if (!rejectId) return
    try {
      await api.post(`/api/events/${rejectId}/reject`, { rejectionReason: reason.trim() })
      toast({ title: 'Event rejected', description: 'Organizer has been notified.', variant: 'success' })
      setRejectId(null)
      setReason('')
      await refresh()
    } catch (err) {
      toast({ title: 'Reject failed', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Event approvals" description="Review pending events and approve/reject with reason." />
      <Card glass className="p-5">
        {loading ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading pending events…</p>
        ) : pending.length === 0 ? (
          <EmptyState title="No pending events" description="All submitted events are processed." />
        ) : (
          <div className="grid gap-4">
            {pending.map((ev) => (
              <Card key={ev.id} className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{ev.name}</p>
                    {ev.resubmission?.wasRejectedBefore ? (
                      <Badge variant="warning" className="mt-1">Resubmitted after rejection</Badge>
                    ) : null}
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {ev.type} • {formatDate(ev.date)} • {ev.place}
                    </p>
                    {ev.resubmission?.previousRejectionReason ? (
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        Previous rejection: {ev.resubmission.previousRejectionReason}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm">{ev.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="gradient" onClick={() => doApprove(ev.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectId(ev.id)}>
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
      <Dialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject event</DialogTitle>
            <DialogDescription>Provide a reason for organizer feedback.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminAnalyticsPage() {
  const { feedbacks } = useOutletContext()

  const chartData = useMemo(() => {
    const byMonth = new Map()
    for (const f of feedbacks) {
      const d = new Date(f.createdAt)
      if (Number.isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth.set(key, (byMonth.get(key) || 0) + 1)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, feedback: count }))
      .slice(-12)
  }, [feedbacks])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Analytics" description="Feedback volume over time (composed chart)." />
      <Card glass>
        <CardHeader>
          <CardTitle>Feedback trend</CardTitle>
          <CardDescription>Counts by month from stored feedback.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.14)" />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="feedback" fill="#4F46E5" name="Feedback" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="feedback" stroke="#14B8A6" name="Trend" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState compact title="No data" description="Feedback will populate this chart." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AdminSecurityPage() {
  const { loginAttempts, lockedEmails, onToggleLock } = useOutletContext()

  const rows = useMemo(
    () =>
      [...loginAttempts]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50)
        .map((a, i) => ({
          id: String(i),
          email: a.email,
          success: a.success,
          time: formatDate(a.timestamp),
        })),
    [loginAttempts],
  )

  const lockRows = Object.values(lockedEmails || {})

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Security logs" description="Local login attempt history and manual locks." />
      <Card glass className="p-5">
        <CardTitle className="mb-2 text-base">Locked accounts</CardTitle>
        {lockRows.length ? (
          <ul className="space-y-2 text-sm">
            {lockRows.map((lock) => (
              <li
                key={lock.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2"
              >
                <span>{lock.email}</span>
                <Button size="sm" variant="outline" onClick={() => onToggleLock(lock.email)}>
                  Unlock
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">No manual locks.</p>
        )}
      </Card>
      <Card glass className="p-5">
        <DataTable
          columns={[
            { key: 'email', header: 'Email' },
            {
              key: 'success',
              header: 'Result',
              render: (row) => <StatusBadge status={row.success ? 'approved' : 'rejected'} />,
            },
            { key: 'time', header: 'Time' },
          ]}
          rows={rows}
          emptyMessage="No attempts recorded."
        />
      </Card>
    </div>
  )
}

function AdminLayout() {
  const {
    adminUsers,
    createUser,
    updateAdminUser,
    changeAdminUserRole,
    changeAdminUserStatus,
    deleteAdminUser,
    refreshAdminUsers,
    loginAttempts,
    lockedEmails,
    deactivatedEmails,
    onToggleLock,
    onToggleDeactivate,
  } = useAuth()
  const data = useAdminData()
  const { notifications, markAllRead, markRead } = useNotifications()

  const outlet = {
    adminUsers,
    createUser,
    updateAdminUser,
    changeAdminUserRole,
    changeAdminUserStatus,
    deleteAdminUser,
    refreshAdminUsers,
    loginAttempts,
    lockedEmails,
    deactivatedEmails,
    onToggleLock,
    onToggleDeactivate,
    feedbacks: data.feedbacks,
    loading: data.loading,
    deleteFeedback: data.deleteFeedback,
  }

  return (
    <RoleLayout
      navItems={navItems}
      notifications={notifications}
      onMarkAllRead={markAllRead}
      onOpenNotification={(n) => markRead(n?.id)}
      searchPlaceholder="Search admin…"
      outletContext={outlet}
    />
  )
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id/edit" element={<AdminUserEditPage />} />
        <Route path="approvals" element={<AdminApprovalsPage />} />
        <Route path="events" element={<EventManagementPage />} />
        <Route path="events/:eventId" element={<EventDetailsPage />} />
        <Route path="feedback" element={<AdminFeedbackPage />} />
        <Route path="comments" element={<AdminCommentModerationPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="security" element={<AdminSecurityPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationPreferencesPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  )
}
