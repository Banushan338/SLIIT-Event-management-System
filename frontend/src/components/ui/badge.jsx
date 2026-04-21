import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30',
        secondary:
          'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] border border-[var(--color-border)]',
        destructive:
          'bg-[var(--color-destructive)]/15 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30',
        success:
          'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        warning:
          'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        info:
          'bg-[var(--color-brand-cyan)]/15 text-[var(--color-brand-cyan)] border border-[var(--color-brand-cyan)]/30',
        gradient: 'text-white bg-brand-gradient border-none shadow-sm',
        outline: 'border border-[var(--color-border)] text-[var(--color-foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
