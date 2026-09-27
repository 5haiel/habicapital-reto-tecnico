import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, api } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import type { Account } from '@/types/api'

interface ShareRow {
  accountId: string
  amount: string
}

function accountName(accounts: Account[] | undefined, id: number): string {
  return accounts?.find((a) => a.id === id)?.name ?? `Cuenta #${id}`
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [payerId, setPayerId] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('')
  const [shares, setShares] = useState<ShareRow[]>([{ accountId: '', amount: '' }])

  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: api.accounts.list })
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: api.expenses.list })

  const resetForm = () => {
    setPayerId('')
    setDescription('')
    setTag('')
    setShares([{ accountId: '', amount: '' }])
  }

  const createExpense = useMutation({
    mutationFn: () =>
      api.expenses.create({
        payer_account_id: Number(payerId),
        description: description || undefined,
        tag: tag || undefined,
        shares: shares
          .filter((s) => s.accountId && Number(s.amount) > 0)
          .map((s) => ({
            account_id: Number(s.accountId),
            amount_owed: Math.round(Number(s.amount) * 100),
          })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setDialogOpen(false)
      resetForm()
      toast.success('Gasto creado')
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo crear el gasto')
    },
  })

  const settleShare = useMutation({
    mutationFn: ({ expenseId, shareId }: { expenseId: number; shareId: number }) =>
      api.expenses.settleShare(expenseId, shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Parte saldada')
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo saldar la parte')
    },
  })

  const validShares = shares.filter((s) => s.accountId && Number(s.amount) > 0)
  const canSubmit = payerId && validShares.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos grupales</h1>
          <p className="text-sm text-muted-foreground">
            Alguien paga por todos, cada quien salda su parte cuando puede.
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            Nuevo gasto
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (canSubmit) createExpense.mutate()
              }}
            >
              <DialogHeader>
                <DialogTitle>Nuevo gasto grupal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-payer">¿Quién pagó?</Label>
                  <Select value={payerId} onValueChange={(v) => setPayerId(v ?? '')}>
                    <SelectTrigger id="expense-payer" className="w-full">
                      <SelectValue placeholder="Elige una cuenta">
                        {(value: string | null) =>
                          value ? accountName(accountsQuery.data, Number(value)) : 'Elige una cuenta'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(accountsQuery.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-description">Descripción (opcional)</Label>
                  <Input
                    id="expense-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Cena de cumpleaños"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-tag">Tag (opcional)</Label>
                  <Input
                    id="expense-tag"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="salida con amigos"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>¿Quién debe, y cuánto?</Label>
                  {shares.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={row.accountId}
                        onValueChange={(value) =>
                          setShares((prev) =>
                            prev.map((s, idx) =>
                              idx === i ? { ...s, accountId: value ?? '' } : s,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Cuenta">
                            {(value: string | null) =>
                              value ? accountName(accountsQuery.data, Number(value)) : 'Cuenta'
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(accountsQuery.data ?? [])
                            .filter((a) => String(a.id) !== payerId)
                            .map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {a.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        className="w-28 shrink-0"
                        placeholder="Monto"
                        value={row.amount}
                        onChange={(e) =>
                          setShares((prev) =>
                            prev.map((s, idx) =>
                              idx === i ? { ...s, amount: e.target.value } : s,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={shares.length === 1}
                        onClick={() => setShares((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShares((prev) => [...prev, { accountId: '', amount: '' }])}
                  >
                    <Plus className="size-3.5" />
                    Agregar persona
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!canSubmit || createExpense.isPending}>
                  {createExpense.isPending ? 'Creando…' : 'Crear gasto'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {expensesQuery.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {expensesQuery.data && expensesQuery.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Todavía no hay gastos grupales. Crea uno con "Nuevo gasto".
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {expensesQuery.data?.map((expense) => (
          <Card key={expense.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {expense.description || 'Gasto grupal'}
                  </CardTitle>
                  <CardDescription>
                    Pagado por {accountName(accountsQuery.data, expense.payer_account_id)} ·{' '}
                    {formatCurrency(expense.total_amount)}
                  </CardDescription>
                </div>
                {expense.tag && <Badge variant="secondary">{expense.tag}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {expense.shares.map((share) => (
                  <li key={share.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{accountName(accountsQuery.data, share.account_id)}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(share.amount_owed)}
                      </span>
                      {share.status === 'paid' ? (
                        <Badge variant="outline" className="text-positive">
                          Pagado
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={settleShare.isPending}
                          onClick={() =>
                            settleShare.mutate({ expenseId: expense.id, shareId: share.id })
                          }
                        >
                          Saldar
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
