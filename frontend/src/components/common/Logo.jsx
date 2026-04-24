import { GraduationCap } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Logo({ collapsed = false, className }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient shadow-glow">
        <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.4} />
        <span
          className="pointer-events-none absolute -inset-px rounded-xl opacity-70 blur-md"
          style={{
            background: 'linear-gradient(135deg, #4F46E5, #14B8A6)',
            zIndex: -1,
          }}
        />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-extrabold tracking-wide text-brand-gradient">
            SLIIT EVENTS
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            University Portal
          </span>
        </div>
      )}
    </div>
  )
}
