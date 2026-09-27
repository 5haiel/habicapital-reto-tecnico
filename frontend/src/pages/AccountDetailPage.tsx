import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError, api, newIdempotencyKey } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

function parseAmountToCents(input: string): number | null {
  const value = Number(input)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100)
}

export default function AccountDetailPage() {
  const { accountId } = useParams()
  const id = Number(accountId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const accountQuery = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => api.accounts.get(id),
  })
  const movementsQuery = useQuery({
    queryKey: ['accounts', id, 'movements'],
    queryFn: () => api.accounts.movements(id),
  })
  const otherAccountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  })

  const invalidateAccountData = () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['accounts', id, 'movements'] })
  }

  const [depositOpen, setDepositOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositTag, setDepositTag] = useState('')

  const deposit = useMutation({
    mutationFn: (amountCents: number) =>
      api.movements.deposit(
        { to_account_id: id, amount: amountCents, tag: depositTag || undefined },
        newIdempotencyKey(),
      ),
    onSuccess: () => {
      invalidateAccountData()
      setDepositOpen(false)
      setDepositAmount('')
      setDepositTag('')
      toast.success('Saldo cargado')
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar el saldo')
    },
  })

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferTo, setTransferTo] = useState<string>('')
  const [transferTag, setTransferTag] = useState('')

  const transfer = useMutation({
    mutationFn: (amountCents: number) =>
      api.movements.transfer(
        {
          from_account_id: id,
          to_account_id: Number(transferTo),
          amount: amountCents,
          tag: transferTag || undefined,
        },
        newIdempotencyKey(),
      ),
    onSuccess: () => {
      invalidateAccountData()
      setTransferOpen(false)
      setTransferAmount('')
      setTransferTo('')
      setTransferTag('')
      toast.success('Transferencia realizada')
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'No se pudo hacer la transferencia',
      )
    },
  })

  const otherAccounts = (otherAccountsQuery.data ?? []).filter((a) => a.id !== id)

  if (accountQuery.isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">No se encontró esta cuenta.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Volver a cuentas
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← Cuentas
        </Link>
      </div>

      <Card>
        <CardHeader>
          {accountQuery.isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <CardTitle className="text-xl">{accountQuery.data?.name}</CardTitle>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {accountQuery.isLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <p className="text-3xl font-semibold tabular-nums">
              {formatCurrency(accountQuery.data?.balance ?? 0)}
            </p>
          )}

          <div className="flex gap-2">
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger render={<Button variant="outline" />}>
                <Plus className="size-4" />
                Cargar saldo
              </DialogTrigger>
              <DialogContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const cents = parseAmountToCents(depositAmount)
                    if (cents) deposit.mutate(cents)
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Cargar saldo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="deposit-amount">Monto</Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        autoFocus
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="100.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deposit-tag">Tag (opcional)</Label>
                      <Input
                        id="deposit-tag"
                        value={depositTag}
                        onChange={(e) => setDepositTag(e.target.value)}
                        placeholder="salario"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={!parseAmountToCents(depositAmount) || deposit.isPending}
                    >
                      {deposit.isPending ? 'Cargando…' : 'Cargar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger render={<Button />}>
                <Send className="size-4" />
                Transferir
              </DialogTrigger>
              <DialogContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const cents = parseAmountToCents(transferAmount)
                    if (cents && transferTo) transfer.mutate(cents)
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Transferir</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="transfer-to">Destino</Label>
                      <Select value={transferTo} onValueChange={(v) => setTransferTo(v ?? '')}>
                        <SelectTrigger id="transfer-to" className="w-full">
                          <SelectValue placeholder="Elige una cuenta">
                            {(value: string | null) =>
                              otherAccounts.find((a) => String(a.id) === value)?.name ??
                              'Elige una cuenta'
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {otherAccounts.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transfer-amount">Monto</Label>
                      <Input
                        id="transfer-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="50.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transfer-tag">Tag (opcional)</Label>
                      <Input
                        id="transfer-tag"
                        value={transferTag}
                        onChange={(e) => setTransferTag(e.target.value)}
                        placeholder="cena"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={
                        !parseAmountToCents(transferAmount) || !transferTo || transfer.isPending
                      }
                    >
                      {transfer.isPending ? 'Enviando…' : 'Transferir'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {movementsQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {movementsQuery.data && movementsQuery.data.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay movimientos en esta cuenta.
            </p>
          )}

          {movementsQuery.data && movementsQuery.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsQuery.data.map((m) => {
                  const isIncoming = m.to_account_id === id
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        {isIncoming ? (
                          <ArrowDownLeft className="size-4 text-positive" aria-label="Entrada" />
                        ) : (
                          <ArrowUpRight
                            className="size-4 text-muted-foreground"
                            aria-label="Salida"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {m.tag ? (
                          <Badge variant="secondary">{m.tag}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(m.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          isIncoming ? 'text-positive' : ''
                        }`}
                      >
                        {isIncoming ? '+' : '-'}
                        {formatCurrency(m.amount)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
