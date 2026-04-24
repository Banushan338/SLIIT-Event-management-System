import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

const TOAST_DURATION_MS = 5000

function ToastGlyph({ variant = 'default' }) {
  const base =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'

  switch (variant) {
    case 'success':
      return (
        <div
          className={cn(
            base,
            'light:bg-emerald-50 light:ring-1 light:ring-emerald-200/80',
            'dark:bg-teal-500/12 dark:ring-1 dark:ring-teal-400/35',
          )}
          aria-hidden
        >
          <CheckCircle2
            className="h-5 w-5 text-emerald-700 light:text-emerald-700 dark:text-teal-300"
            strokeWidth={2.25}
          />
        </div>
      )
    case 'destructive':
      return (
        <div
          className={cn(
            base,
            'light:bg-rose-100/90 light:ring-1 light:ring-rose-200/90',
            'dark:bg-red-500/14 dark:ring-1 dark:ring-red-400/35',
          )}
          aria-hidden
        >
          <AlertCircle
            className="h-5 w-5 text-rose-700 light:text-rose-700 dark:text-red-300"
            strokeWidth={2.25}
          />
        </div>
      )
    case 'warning':
      return (
        <div
          className={cn(
            base,
            'light:bg-amber-100/90 light:ring-1 light:ring-amber-200/90',
            'dark:bg-amber-500/14 dark:ring-1 dark:ring-amber-400/35',
          )}
          aria-hidden
        >
          <AlertTriangle
            className="h-5 w-5 text-amber-800 light:text-amber-800 dark:text-amber-300"
            strokeWidth={2.25}
          />
        </div>
      )
    default:
      return (
        <div
          className={cn(
            base,
            'light:bg-sky-50 light:ring-1 light:ring-sky-200/80',
            'dark:bg-slate-500/15 dark:ring-1 dark:ring-slate-400/25',
          )}
          aria-hidden
        >
          <Info className="h-5 w-5 text-sky-700 light:text-sky-700 dark:text-sky-300/95" strokeWidth={2} />
        </div>
      )
  }
}

const descriptionTone = {
  default: 'text-slate-600 dark:text-slate-400',
  success: 'text-slate-600 dark:text-slate-300',
  destructive: 'text-rose-800/95 dark:text-red-100/90',
  warning: 'text-amber-900/85 dark:text-amber-100/90',
}

const progressTone = {
  default: 'bg-sky-500/80 light:bg-sky-600 dark:bg-sky-400/85',
  success: 'bg-emerald-600/90 light:bg-emerald-600 dark:bg-teal-400/90',
  destructive: 'bg-rose-600/90 light:bg-rose-600 dark:bg-red-400/90',
  warning: 'bg-amber-600/90 light:bg-amber-600 dark:bg-amber-400/85',
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right" duration={TOAST_DURATION_MS}>
      {toasts.map(
        ({ id, title, description, action, variant = 'default', style, ...props }, index) => (
          <Toast
            key={id ?? `toast-${index}`}
            variant={variant}
            duration={TOAST_DURATION_MS}
            style={
              {
                '--toast-duration': `${TOAST_DURATION_MS}ms`,
                ...style,
              }
            }
            {...props}
          >
            <ToastGlyph variant={variant} />
            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription className={descriptionTone[variant] ?? descriptionTone.default}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose variant={variant} />
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden rounded-b-2xl bg-slate-200/40 dark:bg-white/10"
              aria-hidden
            >
              <div
                className={cn(
                  'h-full w-full animate-toast-dismiss opacity-95',
                  progressTone[variant] ?? progressTone.default,
                )}
              />
            </div>
          </Toast>
        ),
      )}
      <ToastViewport />
    </ToastProvider>
  )
}
