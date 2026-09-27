import { Info } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { FormAlert } from '@/components/forms/FormAlert'
import { FormField } from '@/components/forms/FormField'
import { MoneyInput } from '@/components/money/MoneyInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api, errorMessage } from '@/lib/api'
import { formatCurrency, formatPesosInput, parsePesosToCents } from '@/lib/currency'
import { useMoneyAction } from '@/lib/useMoneyAction'

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000]

export function DepositDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const deposit = useMoneyAction(api.movements.deposit)
  const cents = parsePesosToCents(amount)

  function reset() {
    setAmount('')
    setError(null)
    deposit.reset()
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!cents) {
      setError('Escribe un monto válido.')
      return
    }
    setError(null)
    deposit.mutate(
      { amount: cents },
      {
        onSuccess: () => {
          toast.success(`Cargaste ${formatCurrency(cents)} a tu cuenta`)
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
        if (deposit.isPending) return
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Cargar saldo</DialogTitle>
            <DialogDescription>Agrega plata a tu cuenta para enviar o pagar.</DialogDescription>
          </DialogHeader>
          <FormField label="Monto" error={error}>
            <MoneyInput
              size="lg"
              value={amount}
              onValueChange={(v) => {
                setAmount(v)
                setError(null)
              }}
              autoFocus
            />
          </FormField>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Montos rápidos">
            {QUICK_AMOUNTS.map((pesos) => (
              <button
                key={pesos}
                type="button"
                onClick={() => {
                  setAmount(formatPesosInput(String(pesos)))
                  setError(null)
                }}
                className="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {formatCurrency(pesos * 100)}
              </button>
            ))}
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            Carga simulada: no se conecta a ningún banco ni pasarela de pago.
          </p>
          <FormAlert message={deposit.isError ? errorMessage(deposit.error) : null} />
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={deposit.isPending}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={deposit.isPending}>
              {deposit.isPending ? 'Cargando…' : cents ? `Cargar ${formatCurrency(cents)}` : 'Cargar saldo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
