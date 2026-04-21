import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border px-4 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]',
        'light:border-slate-200/90 light:bg-white light:shadow-sm',
        'dark:border-[var(--color-input)] dark:bg-[color-mix(in_srgb,var(--color-card)_55%,transparent)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/50 focus-visible:border-[var(--color-ring)]',
        'transition-all duration-200 shadow-sm',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
