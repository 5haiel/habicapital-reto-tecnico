import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-accent text-primary" aria-hidden>
        <Icon className="size-5" />
      </span>
      <p className="mt-4 font-heading text-base font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="px-6 py-10 text-center" role="alert">
      <p className="font-heading text-base font-semibold">No pudimos cargar esta información</p>
      <p className="mt-1 text-sm text-muted-foreground">Revisa tu conexión e intenta de nuevo.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm font-semibold text-primary hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
