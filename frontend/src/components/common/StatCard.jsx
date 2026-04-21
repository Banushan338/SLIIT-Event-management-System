import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const ACCENT_CLASSES = {
  indigo: 'from-indigo-500/25 to-indigo-500/0 text-indigo-300',
  teal: 'from-teal-500/25 to-teal-500/0 text-teal-300',
  cyan: 'from-cyan-500/25 to-cyan-500/0 text-cyan-300',
  amber: 'from-amber-500/25 to-amber-500/0 text-amber-300',
  rose: 'from-rose-500/25 to-rose-500/0 text-rose-300',
  emerald: 'from-emerald-500/25 to-emerald-500/0 text-emerald-300',
}

export function StatCard({
  label,
  value,
  icon,
  accent = 'indigo',
  trend,
  hint,
  delay = 0,
  className,
}) {
  const TrendIcon = trend && trend.direction === 'down' ? TrendingDown : TrendingUp
  const accentCls = ACCENT_CLASSES[accent] || ACCENT_CLASSES.indigo

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className="h-full"
    >
      <Card
        glass
        className={cn(
          'relative overflow-hidden p-5 md:p-6 h-full',
          'hover:-translate-y-0.5 transition-transform duration-300',
          className,
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl bg-gradient-to-br',
            accentCls,
          )}
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              {value}
            </p>
            {hint && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {hint}
              </p>
            )}
          </div>
          <div
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/50',
              accentCls.split(' ').pop(),
            )}
          >
            {icon}
          </div>
        </div>
        {trend && (
          <div className="relative mt-4 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
                trend.direction === 'down'
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-emerald-500/15 text-emerald-400',
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-[var(--color-muted-foreground)]">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
