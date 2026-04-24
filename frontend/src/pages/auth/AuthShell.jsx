import { motion } from 'framer-motion'

import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'

export function AuthShell({ children }) {
  return (
    <div className="auth-hero-bg relative min-h-screen overflow-hidden">
      <div
        className="aurora-blob pointer-events-none absolute -top-40 -left-20 h-[480px] w-[480px] rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="aurora-blob pointer-events-none absolute bottom-[-20%] right-[-10%] h-[540px] w-[540px] rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, #14B8A6 0%, transparent 70%)', animationDelay: '-4s' }}
        aria-hidden
      />
      <div
        className="aurora-blob pointer-events-none absolute top-1/3 right-1/4 h-[380px] w-[380px] rounded-full opacity-50"
        style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)', animationDelay: '-7s' }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </main>

      <footer className="relative z-10 px-6 pb-6 text-center text-xs text-[var(--color-muted-foreground)]">
        © {new Date().getFullYear()} SLIIT Events • Sri Lanka Institute of Information Technology
      </footer>
    </div>
  )
}
