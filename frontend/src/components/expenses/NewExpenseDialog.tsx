import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { UserAvatar } from '@/components/brand/UserAvatar'
import { FormAlert } from '@/components/forms/FormAlert'
import { FormField } from '@/components/forms/FormField'
import { MoneyInput } from '@/components/money/MoneyInput'
import { PersonChip, PersonSearch } from '@/components/money/PersonPicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { api, errorMessage } from '@/lib/api'
import { formatCurrency, parsePesosToCents } from '@/lib/currency'
import { splitEqually } from '@/lib/expenses'
import { moneyKeys } from '@/lib/queryKeys'
import type { UserPublic } from '@/types/api'

export type ExpenseMode = 'split' | 'charge'
type SplitMode = 'equal' | 'custom'
type Errors = { description?: string | null; people?: string | null; amount?: string | null }

const COPY = {
  split: {
    title: 'Dividir un gasto',
    subtitle: 'Registra lo que pagaste y a quién le toca poner. Cada quien paga su parte desde su cuenta.',
    amountLabel: 'Total que pagaste',
    peopleLabel: 'Con quién lo divides',
    submit: 'Crear gasto',
  },
  charge: {
    title: 'Cobrar a alguien',
    subtitle: 'Pídele a alguien la plata que te debe. Le aparecerá como pendiente por pagar.',
    amountLabel: '¿Cuánto te debe?',
    peopleLabel: 'A quién le cobras',
    submit: 'Enviar cobro',
  },
}

export function NewExpenseDialog({
  mode,
  open,
  onOpenChange,
}: {
  mode: ExpenseMode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const client = useQueryClient()
  const copy = COPY[mode]

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [tag, setTag] = useState('')
  const [people, setPeople] = useState<UserPublic[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [includeMe, setIncludeMe] = useState(true)
  const [custom, setCustom] = useState<Record<number, string>>({})
  const [errors, setErrors] = useState<Errors>({})

  const create = useMutation({
    mutationFn: api.expenses.create,
    onSuccess: () => {
      for (const queryKey of moneyKeys) client.invalidateQueries({ queryKey })
    },
  })

  const totalCents = parsePesosToCents(amount)
  const isCustom = mode === 'split' && splitMode === 'custom'
  const equal = splitEqually(totalCents ?? 0, people.length, mode === 'split' && includeMe)
  const shareCents: (number | null)[] = isCustom
    ? people.map((p) => parsePesosToCents(custom[p.account_id] ?? ''))
    : equal.shares
  const owedToMe = shareCents.reduce<number>((sum, c) => sum + (c ?? 0), 0)

  const clearError = (field: keyof Errors) => setErrors((prev) => ({ ...prev, [field]: null }))

  function reset() {
    setDescription('')
    setAmount('')
    setTag('')
    setPeople([])
    setSplitMode('equal')
    setIncludeMe(true)
    setCustom({})
    setErrors({})
    create.reset()
  }

  function validate(): Errors {
    const next: Errors = {
      description: description.trim() ? null : 'Cuéntale a los demás de qué es el gasto.',
      people: people.length ? null : mode === 'charge' ? 'Elige a quién le cobras.' : 'Agrega al menos una persona.',
      amount: null,
    }
    if (isCustom) {
      if (shareCents.some((c) => !c)) next.amount = 'Escribe un monto válido para cada persona.'
    } else if (!totalCents) {
      next.amount = 'Escribe un monto válido.'
    } else if (people.length && shareCents.some((c) => !c || c <= 0)) {
      next.amount = 'El monto es muy pequeño para dividirlo entre tantas personas.'
    }
    return next
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (next.description || next.people || next.amount) return
    create.mutate(
      {
        description: description.trim(),
        tag: tag.trim() || undefined,
        shares: people.map((p, i) => ({ account_id: p.account_id, amount_owed: shareCents[i] as number })),
      },
      {
        onSuccess: () => {
          toast.success(
            mode === 'charge'
              ? `Le cobraste ${formatCurrency(owedToMe)} a ${people[0].name}`
              : `Gasto creado: te deben ${formatCurrency(owedToMe)}`,
          )
          onOpenChange(false)
          reset()
        },
      },
    )
  }

  const canAddMore = mode === 'split' || people.length === 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (create.isPending) return
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <FormField label="Concepto" error={errors.description}>
              <Input
                value={description}
                maxLength={280}
                placeholder={mode === 'charge' ? 'Ej. Boletas del concierto' : 'Ej. Cena de cumpleaños'}
                onChange={(e) => {
                  setDescription(e.target.value)
                  clearError('description')
                }}
                autoFocus
              />
            </FormField>
            <FormField label="Etiqueta" optional>
              <Input value={tag} maxLength={60} placeholder="cena" onChange={(e) => setTag(e.target.value)} />
            </FormField>
          </div>

          <FormField label={copy.peopleLabel} error={errors.people}>
            <div className="space-y-2">
              {people.map((p) => (
                <PersonChip
                  key={p.account_id}
                  person={p}
                  removeLabel="Quitar"
                  onRemove={() => setPeople((prev) => prev.filter((x) => x.account_id !== p.account_id))}
                />
              ))}
              {canAddMore && (
                <PersonSearch
                  onSelect={(p) => {
                    setPeople((prev) => [...prev, p])
                    clearError('people')
                  }}
                  excludeAccountIds={people.map((p) => p.account_id)}
                  placeholder={people.length ? 'Agregar otra persona' : 'Busca por nombre o correo'}
                />
              )}
            </div>
          </FormField>

          {mode === 'split' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Cómo dividir"
                value={splitMode}
                onValueChange={setSplitMode}
                options={[
                  { value: 'equal', label: 'Partes iguales' },
                  { value: 'custom', label: 'Montos a mano' },
                ]}
              />
              {splitMode === 'equal' && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeMe}
                    onChange={(e) => setIncludeMe(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                  Incluirme en la división
                </label>
              )}
            </div>
          )}

          {isCustom ? (
            <FormField label="¿Cuánto pone cada quien?" error={errors.amount}>
              <div className="space-y-2">
                {people.length === 0 && (
                  <p className="text-sm text-muted-foreground">Agrega personas para asignar montos.</p>
                )}
                {people.map((p) => (
                  <div key={p.account_id} className="grid grid-cols-[1fr_10rem] items-center gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <UserAvatar name={p.name} className="size-7 text-[10px]" />
                      <span className="truncate">{p.name}</span>
                    </span>
                    <MoneyInput
                      aria-label={`Monto de ${p.name}`}
                      value={custom[p.account_id] ?? ''}
                      onValueChange={(v) => {
                        setCustom((prev) => ({ ...prev, [p.account_id]: v }))
                        clearError('amount')
                      }}
                    />
                  </div>
                ))}
              </div>
            </FormField>
          ) : (
            <FormField label={copy.amountLabel} error={errors.amount}>
              <MoneyInput
                size="lg"
                value={amount}
                onValueChange={(v) => {
                  setAmount(v)
                  clearError('amount')
                }}
              />
            </FormField>
          )}

          {people.length > 0 && owedToMe > 0 && (
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">Te deben en total</p>
                <p className="amount text-lg font-bold text-primary">{formatCurrency(owedToMe)}</p>
              </div>
              {mode === 'split' && !isCustom && (
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {people.map((p, i) => (
                    <li key={p.account_id} className="flex justify-between gap-3">
                      <span className="truncate">{p.name}</span>
                      <span className="amount">{formatCurrency(shareCents[i] ?? 0)}</span>
                    </li>
                  ))}
                  {includeMe && (
                    <li className="flex justify-between gap-3">
                      <span>Tu parte</span>
                      <span className="amount">{formatCurrency(equal.payerPart)}</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          <FormAlert message={create.isError ? errorMessage(create.error) : null} />
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={create.isPending}>
              {create.isPending ? 'Guardando…' : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
