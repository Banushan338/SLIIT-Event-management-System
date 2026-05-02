import { Sparkles, TrendingUp, ShieldCheck, Users, Megaphone } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, extractErrorMessage } from '@/lib/api'

export function AICopilotEventAssistant({ form }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const runAI = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/ai/event-copilot', {
        name: form.name,
        description: form.description,
        type: form.type,
        totalSeats: form.totalSeats,
        place: form.place,
      })
      setResult(res.data)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to run AI Copilot'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card glass className="p-4 border border-violet-500/30 bg-violet-500/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Event Copilot
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Generate intelligent planning recommendations before submission.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={runAI} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run AI Copilot'}
        </Button>
      </div>

      {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}

      {result ? (
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Info icon={<TrendingUp className="h-4 w-4" />} label="Approval Chance" value={`${result.approvalChance}%`} />
          <Info icon={<Users className="h-4 w-4" />} label="Expected Audience" value={result.expectedAudience} />
          <Info icon={<ShieldCheck className="h-4 w-4" />} label="Risk Level" value={result.riskLevel} />
          <Info icon={<Megaphone className="h-4 w-4" />} label="Staff Needed" value={result.suggestedStaffNeeded} />

          <div className="md:col-span-2 rounded-xl border border-[var(--color-border)] p-3">
            <p className="font-medium">Enhanced Title</p>
            <p className="text-[var(--color-muted-foreground)]">{result.enhancedTitle}</p>
          </div>

          <div className="md:col-span-2 rounded-xl border border-[var(--color-border)] p-3">
            <p className="font-medium">Promotion Tip</p>
            <p className="text-[var(--color-muted-foreground)]">{result.bestPromotionMethod}</p>
          </div>

          <div className="md:col-span-2 rounded-xl border border-[var(--color-border)] p-3">
            <p className="font-medium">AI Remark</p>
            <p className="text-[var(--color-muted-foreground)]">{result.aiRemark}</p>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function Info({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </p>
      <p>{value}</p>
    </div>
  )
}