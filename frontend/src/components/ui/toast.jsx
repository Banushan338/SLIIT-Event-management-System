import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col items-end gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-4 md:max-w-[420px]',
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

/** Light: crisp cards with left accent. Dark: subtle slate + brand teal (success) not loud green fills. */
const toastVariants = cva(
  [
    'group pointer-events-auto relative ml-auto flex w-[min(100%,22rem)] max-w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 pb-[calc(1rem+3px)] pr-10 shadow-xl backdrop-blur-xl',
    'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full data-[state=open]:duration-300',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'light:border-slate-200/90 light:bg-white light:text-slate-900 light:shadow-[0_12px_40px_-16px_rgba(15,23,42,0.14)] light:ring-1 light:ring-slate-900/[0.06]',
          'light:border-l-[3px] light:border-l-sky-500',
          'dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-50 dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.72)] dark:ring-1 dark:ring-white/[0.07]',
          'dark:border-l-[3px] dark:border-l-sky-400/90',
        ].join(' '),
        success: [
          'light:border-slate-200/90 light:bg-white light:text-slate-900 light:shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] light:ring-1 light:ring-slate-900/[0.05]',
          'light:border-l-[3px] light:border-l-emerald-600',
          'dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-50 dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.72)] dark:ring-1 dark:ring-white/[0.06]',
          'dark:border-l-[3px] dark:border-l-teal-400',
        ].join(' '),
        destructive: [
          'light:border-rose-200/95 light:border-l-[3px] light:border-l-rose-600 light:bg-rose-50/95 light:text-rose-950 light:shadow-[0_12px_40px_-16px_rgba(225,29,72,0.14)] light:ring-1 light:ring-rose-900/[0.06]',
          'dark:border-red-500/30 dark:border-l-[3px] dark:border-l-red-400 dark:bg-slate-950/95 dark:text-red-50 dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.75)] dark:ring-1 dark:ring-red-500/15',
        ].join(' '),
        warning: [
          'light:border-amber-200/95 light:border-l-[3px] light:border-l-amber-500 light:bg-amber-50/95 light:text-amber-950 light:shadow-[0_12px_40px_-16px_rgba(217,119,6,0.12)] light:ring-1 light:ring-amber-900/[0.06]',
          'dark:border-amber-500/25 dark:border-l-[3px] dark:border-l-amber-400 dark:bg-slate-950/95 dark:text-amber-50 dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.72)] dark:ring-1 dark:ring-amber-400/12',
        ].join(' '),
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-xs font-semibold transition-colors hover:bg-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const toastCloseVariants = {
  default:
    'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100',
  success:
    'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-900 dark:text-teal-300/90 dark:hover:bg-teal-500/15 dark:hover:text-white',
  destructive:
    'text-rose-700 hover:bg-rose-100/90 hover:text-rose-950 dark:text-red-300/90 dark:hover:bg-red-500/15 dark:hover:text-red-50',
  warning:
    'text-amber-800 hover:bg-amber-100/90 hover:text-amber-950 dark:text-amber-300/90 dark:hover:bg-amber-500/15 dark:hover:text-amber-50',
}

const ToastClose = React.forwardRef(({ className, variant = 'default', ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2.5 top-2.5 rounded-lg p-1.5 opacity-90 transition-all focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-0',
      toastCloseVariants[variant] ?? toastCloseVariants.default,
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" aria-hidden />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-[0.9375rem] font-semibold leading-snug tracking-tight', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('toast-desc text-[0.8125rem] leading-relaxed', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
