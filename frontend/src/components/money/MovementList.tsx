import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { formatSignedCurrency } from '@/lib/currency'
import { formatDay, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Movement } from '@/types/api'

function movementTitle(m: Movement): string {
  if (m.type === 'deposit') return 'Carga de saldo'
  const name = m.counterparty?.name ?? 'Alguien'
  return m.direction === 'in' ? `${name} te envió` : `Enviaste a ${name}`
}

function MovementIcon({ movement }: { movement: Movement }) {
  const Icon = movement.type === 'deposit' ? Wallet : movement.direction === 'in' ? ArrowDownLeft : ArrowUpRight
  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full',
        movement.direction === 'in' ? 'bg-positive-soft text-positive' : 'bg-accent text-primary',
      )}
      aria-hidden
    >
      <Icon className="size-[18px]" />
    </span>
  )
}

export function MovementRow({ movement }: { movement: Movement }) {
  const details = [movement.description, formatTime(movement.created_at)].filter(Boolean).join(' · ')
  return (
    <li className="flex items-center gap-3 py-3.5">
      <MovementIcon movement={movement} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{movementTitle(movement)}</p>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          <p className="truncate text-xs text-muted-foreground">{details}</p>
          {movement.tag && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              #{movement.tag}
            </span>
          )}
        </div>
      </div>
      <p
        className={cn(
          'amount shrink-0 text-sm font-semibold',
          movement.direction === 'in' ? 'text-positive' : 'text-foreground',
        )}
      >
        {formatSignedCurrency(movement.amount, movement.direction)}
      </p>
    </li>
  )
}

/** Movements grouped under "Hoy" / "Ayer" / date headers, newest first. */
export function MovementList({ movements }: { movements: Movement[] }) {
  const groups: { day: string; items: Movement[] }[] = []
  for (const m of movements) {
    const day = formatDay(m.created_at)
    const last = groups[groups.length - 1]
    if (last?.day === day) last.items.push(m)
    else groups.push({ day, items: [m] })
  }
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <section key={group.day} aria-label={group.day}>
          <h3 className="pt-2 font-sans text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.day}
          </h3>
          <ul className="divide-y">
            {group.items.map((m) => (
              <MovementRow key={m.id} movement={m} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function MovementListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y" aria-label="Cargando movimientos">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  )
}
