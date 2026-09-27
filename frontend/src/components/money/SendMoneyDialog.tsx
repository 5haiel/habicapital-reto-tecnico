import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
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
import { api, errorMessage } from '@/lib/api'
import { formatCurrency, parsePesosToCents } from '@/lib/currency'
import { queryKeys } from '@/lib/queryKeys'
import { useMoneyAction } from '@/lib/useMoneyAction'
import type { UserPublic } from '@/types/api'

type Errors = { person?: string | null; amount?: string | null }

export function SendMoneyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const account = useQuery({ queryKey: queryKeys.account, queryFn: api.me.account, enabled: open })
  const tags = useQuery({ queryKey: queryKeys.tags, queryFn: api.tags.list, enabled: open })

  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [person, setPerson] = useState<UserPublic | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const send = useMoneyAction(api.movements.transfer)
  const cents = parsePesosToCents(amount)

  function reset() {
    setStep('form')
    setPerson(null)
    setAmount('')
    setDescription('')
    setTag('')
    setErrors({})
    send.reset()
  }

  function onReview(event: FormEvent) {
    event.preventDefault()
    const next: Errors = {
      person: person ? null : 'Elige a quién le envías.',
      amount: !cents
        ? 'Escribe un monto válido.'
        : account.data && cents > account.data.balance
          ? `Tu saldo disponible es ${formatCurrency(account.data.balance)}.`
          : null,
    }
    setErrors(next)
    if (!next.person && !next.amount) setStep('confirm')
  }

  function onConfirm() {
    if (!person || !cents) return
    send.mutate(
      {
        to_account_id: person.account_id,
        amount: cents,
        description: description.trim() || undefined,
        tag: tag.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Enviaste ${formatCurrency(cents)} a ${person.name}`)
          onOpenChange(false)
          reset()
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (send.isPending) return
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent>
        {step === 'form' ? (
          <form onSubmit={onReview} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Enviar plata</DialogTitle>
              <DialogDescription>
                {account.data
                  ? `Disponible: ${formatCurrency(account.data.balance)}`
                  : 'Transfiere a cualquier persona con cuenta.'}
              </DialogDescription>
            </DialogHeader>

            <FormField label="Para" error={errors.person}>
              {person ? (
                <div>
                  <PersonChip person={person} onRemove={() => setPerson(null)} />
                </div>
              ) : (
                <PersonSearch
                  onSelect={(p) => {
                    setPerson(p)
                    setErrors((prev) => ({ ...prev, person: null }))
                  }}
                  autoFocus
                />
              )}
            </FormField>
            <FormField label="Monto" error={errors.amount}>
              <MoneyInput
                size="lg"
                value={amount}
                onValueChange={(v) => {
                  setAmount(v)
                  setErrors((prev) => ({ ...prev, amount: null }))
                }}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <FormField label="¿Para qué es?" optional>
                <Input
                  value={description}
                  maxLength={280}
                  placeholder="Ej. Mercado de la semana"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormField>
              <FormField label="Etiqueta" optional>
                <Input
                  value={tag}
                  maxLength={60}
                  placeholder="casa"
                  list="send-tags"
                  onChange={(e) => setTag(e.target.value)}
                />
              </FormField>
              <datalist id="send-tags">
                {tags.data?.map((t) => <option key={t.id} value={t.name} />)}
              </datalist>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="lg">
                Continuar
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Confirma el envío</DialogTitle>
              <DialogDescription>Revisa los datos antes de enviar. Esta acción no se puede deshacer.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl bg-muted/50 p-5 text-center">
              {person && <UserAvatar name={person.name} className="mx-auto size-12 text-sm" />}
              <p className="mt-3 text-sm text-muted-foreground">Vas a enviar</p>
              <p className="amount mt-1 text-3xl font-bold">{cents ? formatCurrency(cents) : ''}</p>
              <p className="mt-1 text-sm">
                a <span className="font-semibold">{person?.name}</span>
              </p>
              {(description || tag) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {[description.trim(), tag.trim() && `#${tag.trim()}`].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <FormAlert message={send.isError ? errorMessage(send.error) : null} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={send.isPending}
                onClick={() => {
                  send.reset()
                  setStep('form')
                }}
              >
                <ArrowLeft />
                Editar
              </Button>
              <Button type="button" size="lg" disabled={send.isPending} onClick={onConfirm}>
                {send.isPending ? 'Enviando…' : `Enviar ${cents ? formatCurrency(cents) : ''}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
