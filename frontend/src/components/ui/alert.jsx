import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-xl border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-muted)]/50 border-[var(--color-border)] text-[var(--color-foreground)]',
        destructive:
          'border-[var(--color-destructive)]/30 text-[var(--color-destructive)] bg-[var(--color-destructive)]/10',
        success:
          'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
        info:
          'border-[var(--color-brand-cyan)]/30 text-[var(--color-brand-cyan)] bg-[var(--color-brand-cyan)]/10',
        warning:
          'border-amber-500/30 text-amber-400 bg-amber-500/10',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed opacity-90', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
