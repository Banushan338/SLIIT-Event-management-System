import { BellRing } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

export function NotificationPreferencesPage() {
  const [email, setEmail] = useState(true)
  const [inApp, setInApp] = useState(true)
  const [reminders, setReminders] = useState(true)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Preferences"
        title="Notifications"
        description="Control how you receive event and system updates."
      />

      <Card glass className="p-6 space-y-4">
        <PrefRow label="Email updates" checked={email} onCheckedChange={setEmail} />
        <PrefRow label="In-app alerts" checked={inApp} onCheckedChange={setInApp} />
        <PrefRow label="Event reminders" checked={reminders} onCheckedChange={setReminders} />
        <div className="pt-2">
          <Button variant="gradient" size="sm">Save preferences</Button>
        </div>
      </Card>

      <EmptyState
        compact
        icon={<BellRing className="h-5 w-5" />}
        title="Connected to live notifications"
        description="Real-time notifications will still appear in the top bar while enabled."
      />
    </div>
  )
}

function PrefRow({ label, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3">
      <p className="text-sm">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
