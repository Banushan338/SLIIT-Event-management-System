import { Bot, Send, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, extractErrorMessage } from '@/lib/api'

export function AIFloatingCopilot() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)

  const askAI = async () => {
    if (!message.trim()) return

    const currentMessage = message
    setMessage('')
    setLoading(true)
    setReply('')

    try {
      const res = await api.post('/api/ai/chat', { message: currentMessage })
      setReply(res.data?.reply || '')
    } catch (err) {
      setReply(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-violet-600 p-4 shadow-lg"
      >
        {open ? <X className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
      </button>

      {open ? (
        <Card className="fixed bottom-24 right-6 z-50 w-[340px] p-4 shadow-2xl">
          <p className="text-sm font-semibold">Smart Event Copilot</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
            Ask about event planning, approvals, feedback, or recommendations.
          </p>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  askAI()
                }
              }}
              placeholder="Ask something..."
            />

            <Button size="icon" onClick={askAI} disabled={loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {(loading || reply) ? (
            <div className="mt-3 rounded-xl border border-[var(--color-border)] p-3 text-sm min-h-[70px]">
              {loading ? 'Thinking...' : reply}
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  )
}