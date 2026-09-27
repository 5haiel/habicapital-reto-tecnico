import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full bg-accent font-heading text-xs font-bold text-accent-foreground',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
