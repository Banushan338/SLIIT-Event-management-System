import { Brain, Smile, AlertTriangle, Lightbulb } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Card } from '@/components/ui/card'
import { api, extractErrorMessage } from '@/lib/api'

export function AIFeedbackInsights({ eventId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const res = await api.get(`/api/ai/feedback-insights/${eventId}`)
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
      <Card glass className="p-4">
        <p className="text-xs text-rose-400">{error}</p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card glass className="p-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">AI analyzing student responses...</p>
      </Card>
    )
  }

  return (
    <Card glass className="p-5 border border-emerald-500/20 bg-emerald-500/5">
      <p className="text-base font-semibold inline-flex items-center gap-2">
        <Brain className="h-4 w-4" />
        AI Feedback Intelligence
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
        <Insight icon={<Smile className="h-4 w-4" />} label="Sentiment Score" value={`${data.sentimentScore}%`} />
        <Insight icon={<AlertTriangle className="h-4 w-4" />} label="Top Issue" value={data.topIssue} />
        <Insight icon={<Lightbulb className="h-4 w-4" />} label="Positive Area" value={data.positiveArea} />
        <Insight icon={<Brain className="h-4 w-4" />} label="Recommendation" value={data.recommendation} />
      </div>
    </Card>
  )
}

function Insight({ icon, label, value }) {
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