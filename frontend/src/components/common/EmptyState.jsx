import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 text-center',
        compact ? 'px-6 py-10' : 'px-8 py-16',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(400px 200px at 50% 0%, rgba(79,70,229,0.10), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center">
        {icon && (
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient-soft border border-[var(--color-border)]">
            <span className="text-[var(--color-brand-cyan)]">{icon}</span>
          </div>
        )}
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-[var(--color-muted-foreground)]">
            {description}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </motion.div>
  )
}
