import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

import { UserAvatar } from '@/components/brand/UserAvatar'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { UserPublic } from '@/types/api'

/** Search people by name or email. Balances are never shown (the API doesn't return them). */
export function PersonSearch({
  onSelect,
  excludeAccountIds = [],
  placeholder = 'Busca por nombre o correo',
  autoFocus,
  id,
  ...aria
}: {
  onSelect: (person: UserPublic) => void
  excludeAccountIds?: number[]
  placeholder?: string
  autoFocus?: boolean
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim())
  // Both must agree: right after picking someone the input clears, and the
  // still-pending debounced term must not flash a stale "no results".
  const enabled = debounced.length >= 2 && query.trim() === debounced
  const results = useQuery({
    queryKey: queryKeys.userSearch(debounced),
    queryFn: () => api.users.search(debounced),
    enabled,
    staleTime: 30_000,
  })
  const visible = (results.data ?? []).filter((p) => !excludeAccountIds.includes(p.account_id))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          {...aria}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className="pl-9"
        />
      </div>
      {enabled && (
        <div className="max-h-56 overflow-y-auto rounded-lg border bg-background" role="listbox" aria-label="Resultados">
          {results.isPending ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Buscando…</p>
          ) : results.isError ? (
            <p className="px-3 py-3 text-sm text-destructive">No pudimos buscar. Intenta de nuevo.</p>
          ) : visible.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No encontramos a nadie con “{debounced}”.
            </p>
          ) : (
            visible.map((person) => (
              <button
                key={person.account_id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onSelect(person)
                  setQuery('')
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <UserAvatar name={person.name} className="size-8 text-[11px]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{person.email}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function PersonChip({
  person,
  onRemove,
  removeLabel = 'Cambiar',
}: {
  person: { name: string; email?: string }
  onRemove?: () => void
  removeLabel?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
      <UserAvatar name={person.name} className="size-8 text-[11px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.name}</p>
        {person.email && <p className="truncate text-xs text-muted-foreground">{person.email}</p>}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`${removeLabel}: ${person.name}`}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
