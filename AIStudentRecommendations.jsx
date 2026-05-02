import { Sparkles, CalendarDays, MapPin, Percent } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, extractErrorMessage } from '@/lib/api'

export function AIStudentRecommendations() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const res = await api.get('/api/ai/student-recommendations')
        if (!ignore) setItems(res.data?.recommendations || [])
      } catch (err) {
        if (!ignore) setError(extractErrorMessage(err))
      }
    }

    load()

    return () => {
      ignore = true
    }
  }, [])

  return (
    <Card glass className="p-5 border border-violet-500/20 bg-violet-500/5">
      <p className="text-base font-semibold inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        AI Recommended For You
      </p>

      {error ? <p className="mt-3 text-xs text-rose-400">{error}</p> : null}

      {!error && items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">Analyzing campus trends...</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--color-border)] p-4 text-sm">
              <p className="font-semibold">{item.name}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-[var(--color-muted-foreground)]">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(item.date).toLocaleDateString()}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-[var(--color-muted-foreground)]">
                <MapPin className="h-3.5 w-3.5" />
                {item.place}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-emerald-300">
                <Percent className="h-3.5 w-3.5" />
                Match {item.matchScore}%
              </p>
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{item.reason}</p>

              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate(`/student/event/${item.id}`)}
              >
                View Event
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}