import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('size-7', className)}>
      <path
        d="M4 11.2 12 4.2l8 7V19a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="19.6" cy="4.6" r="1.7" className="fill-brand-pink" />
    </svg>
  )
}

/** Wordmark: violet house + "habi" + "capital" in brand teal. `tone="light"` for dark backgrounds. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-heading text-[1.35rem] leading-none tracking-tight',
        className,
      )}
    >
      <LogoMark className={tone === 'light' ? 'text-white' : 'text-primary'} />
      <span className={cn('font-bold', tone === 'light' ? 'text-white' : 'text-foreground')}>habi</span>
      <span className={cn('-ml-1.5 font-semibold', tone === 'light' ? 'text-brand-teal' : 'text-positive')}>
        capital
      </span>
    </span>
  )
}
