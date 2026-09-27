import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { UserAvatar } from '@/components/brand/UserAvatar'
import { FormAlert } from '@/components/forms/FormAlert'
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
import { formatCurrency } from '@/lib/currency'
import type { OwedShare } from '@/lib/expenses'
import { moneyKeys, queryKeys } from '@/lib/queryKeys'

/**
 * Pays one pending share. No Idempotency-Key needed from the client: the
 * backend derives it from the share id, so paying twice is a no-op.
 */
export function PayShareDialog({
  target,
  onClose,
}: {
  target: OwedShare | null
  onClose: () => void
}) {
  const client = useQueryClient()
  const account = useQuery({ queryKey: queryKeys.account, queryFn: api.me.account, enabled: !!target })
  const pay = useMutation({
    mutationFn: ({ expense, share }: OwedShare) => api.expenses.settleShare(expense.id, share.id),
    onSuccess: (_, { expense, share }) => {
      for (const queryKey of moneyKeys) client.invalidateQueries({ queryKey })
      toast.success(`Le pagaste ${formatCurrency(share.amount_owed)} a ${expense.payer_name}`)
      onClose()
    },
  })

  const insufficient = !!target && !!account.data && account.data.balance < target.share.amount_owed

  return (
    <Dialog
      open={!!target}
      onOpenChange={(open) => {
        if (!open && !pay.isPending) {
          pay.reset()
          onClose()
        }
      }}
    >
      <DialogContent>
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>Pagar tu parte</DialogTitle>
              <DialogDescription>{target.expense.description ?? 'Gasto compartido'}</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl bg-muted/50 p-5 text-center">
              <UserAvatar name={target.expense.payer_name} className="mx-auto size-12 text-sm" />
              <p className="mt-3 text-sm text-muted-foreground">Vas a pagarle a {target.expense.payer_name}</p>
              <p className="amount mt-1 text-3xl font-bold">{formatCurrency(target.share.amount_owed)}</p>
              {account.data && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tu saldo después: {formatCurrency(Math.max(account.data.balance - target.share.amount_owed, 0))}
                </p>
              )}
            </div>
            <FormAlert
              message={
                pay.isError
                  ? errorMessage(pay.error)
                  : insufficient
                    ? `No te alcanza: tu saldo es ${formatCurrency(account.data!.balance)}. Carga saldo primero.`
                    : null
              }
            />
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={pay.isPending}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={pay.isPending || insufficient}
                onClick={() => pay.mutate(target)}
              >
                {pay.isPending ? 'Pagando…' : `Pagar ${formatCurrency(target.share.amount_owed)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
