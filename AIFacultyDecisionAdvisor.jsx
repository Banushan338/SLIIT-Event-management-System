import { BrainCircuit, ShieldAlert, CheckCircle2, Percent } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Card } from '@/components/ui/card'
import { api, extractErrorMessage } from '@/lib/api'

export function AIFacultyDecisionAdvisor({ eventId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const res = await api.get(`/api/ai/faculty-advisor/${eventId}`)
        if (!ignore) setData(res.data)
      } catch (err) {
        if (!ignore) setError(extractErrorMessage(err))
      }
    }

    if (eventId) load()

    return () => {
      ignore = true
    }
  }, [eventId])

  if (error) {
    return (
      <Card glass className="mt-3 p-3 border border-rose-500/20">
        <p className="text-xs text-rose-400">{error}</p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card glass className="mt-3 p-3">
        <p className="text-xs text-[var(--color-muted-foreground)]">AI reviewing submission...</p>
      </Card>
    )
  }

  return (
    <Card glass className="mt-3 p-4 border border-cyan-500/20 bg-cyan-500/5">
      <p className="text-sm font-semibold inline-flex items-center gap-2">
        <BrainCircuit className="h-4 w-4" />
        AI Faculty Decision Advisor
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
        <Mini icon={<Percent className="h-4 w-4" />} label="Confidence" value={`${data.confidence}%`} />
        <Mini icon={<CheckCircle2 className="h-4 w-4" />} label="Recommendation" value={data.recommendation} />
        <Mini icon={<ShieldAlert className="h-4 w-4" />} label="Venue Conflict" value={data.venueConflictRisk} />
        <Mini icon={<ShieldAlert className="h-4 w-4" />} label="Duplicate Risk" value={data.duplicateTopicRisk} />
      </div>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] p-3 text-sm">
        <p className="font-medium">AI Reasoning</p>
        <p className="text-[var(--color-muted-foreground)]">{data.aiReason}</p>
      </div>
    </Card>
  )
}

function Mini({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <p className="mb-1 flex items-center gap-1 text-xs uppercase text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </p>
      <p>{value}</p>
    </div>
  )
}