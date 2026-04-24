import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

export function FilterChips({ options = [], value, onChange, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 p-1 rounded-2xl bg-[var(--color-muted)]/60 border border-[var(--color-border)]',
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange?.(opt.value)}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors',
              isActive
                ? 'text-white'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`chip-active-${opt.groupId ?? 'default'}`}
                className="absolute inset-0 rounded-xl bg-brand-gradient shadow-glow"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <span className="relative flex items-center gap-1.5 whitespace-nowrap">
              {opt.icon}
              {opt.label}
              {typeof opt.count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
                  )}
                >
                  {opt.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
