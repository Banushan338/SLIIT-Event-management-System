import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'shimmer rounded-xl bg-[var(--color-muted)]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
