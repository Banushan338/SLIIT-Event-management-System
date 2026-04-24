import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function DataToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  leading,
  trailing,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{leading}</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {onSearchChange !== undefined && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <Input
              value={search ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 pl-10"
            />
          </div>
        )}
        {trailing}
      </div>
    </div>
  )
}
