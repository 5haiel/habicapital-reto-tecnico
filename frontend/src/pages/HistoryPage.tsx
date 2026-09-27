import { useQuery } from '@tanstack/react-query'
import { History, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState, ErrorState } from '@/components/EmptyState'
import { PageHeader, Panel } from '@/components/layout/PageHeader'
import { MovementList, MovementListSkeleton } from '@/components/money/MovementList'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { queryKeys } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'

type DirectionFilter = 'all' | 'in' | 'out'

export default function HistoryPage() {
  useDocumentTitle('Historial')
  const movements = useQuery({ queryKey: queryKeys.movements, queryFn: api.me.movements })
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [text, setText] = useState('')

  const tags = useMemo(
    () => [...new Set((movements.data ?? []).map((m) => m.tag).filter((t): t is string => !!t))].sort(),
    [movements.data],
  )

  const filtered = useMemo(() => {
    const needle = text.trim().toLowerCase()
    return (movements.data ?? []).filter(
      (m) =>
        (direction === 'all' || m.direction === direction) &&
        (!tag || m.tag === tag) &&
        (!needle ||
          [m.counterparty?.name, m.description, m.tag, m.type === 'deposit' ? 'carga de saldo' : '']
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(needle))),
    )
  }, [movements.data, direction, tag, text])

  const totalIn = filtered.filter((m) => m.direction === 'in').reduce((s, m) => s + m.amount, 0)
  const totalOut = filtered.filter((m) => m.direction === 'out').reduce((s, m) => s + m.amount, 0)
  const hasFilters = direction !== 'all' || !!tag || !!text.trim()

  return (
    <>
      <PageHeader title="Historial" />

      <Panel>
        <div className="flex flex-col gap-3 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            label="Filtrar por tipo"
            value={direction}
            onValueChange={setDirection}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'in', label: 'Entradas' },
              { value: 'out', label: 'Salidas' },
            ]}
          />
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Buscar persona o concepto"
              aria-label="Buscar en el historial"
              className="pl-9"
            />
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b py-4" role="group" aria-label="Filtrar por etiqueta">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  tag === t
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {movements.data && filtered.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 pt-4 text-sm text-muted-foreground">
            <span>
              {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
            </span>
            <span>
              Entradas <span className="amount font-semibold text-positive">{formatCurrency(totalIn)}</span>
            </span>
            <span>
              Salidas <span className="amount font-semibold text-foreground">{formatCurrency(totalOut)}</span>
            </span>
          </div>
        )}

        <div className="pt-2">
          {movements.isPending ? (
            <MovementListSkeleton rows={6} />
          ) : movements.isError ? (
            <ErrorState onRetry={() => movements.refetch()} />
          ) : movements.data.length === 0 ? (
            <EmptyState
              icon={History}
              title="Tu historial está vacío"
              description="Cuando cargues saldo, envíes o recibas plata, lo verás aquí."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nada coincide con tu búsqueda"
              action={
                hasFilters && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary hover:underline"
                    onClick={() => {
                      setDirection('all')
                      setTag(null)
                      setText('')
                    }}
                  >
                    Limpiar filtros
                  </button>
                )
              }
            />
          ) : (
            <MovementList movements={filtered} />
          )}
        </div>
      </Panel>
    </>
  )
}
