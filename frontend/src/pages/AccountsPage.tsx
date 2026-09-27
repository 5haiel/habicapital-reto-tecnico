import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiError, api } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

export default function AccountsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: api.accounts.list,
  })

  const createAccount = useMutation({
    mutationFn: (accountName: string) => api.accounts.create(accountName),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setDialogOpen(false)
      setName('')
      toast.success(`Cuenta "${account.name}" creada`)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo crear la cuenta')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cuentas</h1>
          <p className="text-sm text-muted-foreground">
            Crea cuentas y muévete entre ellas para ver saldo e historial.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            Nueva cuenta
          </DialogTrigger>
          <DialogContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim()) createAccount.mutate(name.trim())
              }}
            >
              <DialogHeader>
                <DialogTitle>Nueva cuenta</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="account-name">Nombre</Label>
                <Input
                  id="account-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ana"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!name.trim() || createAccount.isPending}>
                  {createAccount.isPending ? 'Creando…' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las cuentas</CardTitle>
          <CardDescription>
            {accountsQuery.data ? `${accountsQuery.data.length} cuenta(s)` : ' '}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountsQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {accountsQuery.isError && (
            <p className="text-sm text-destructive">
              No se pudieron cargar las cuentas.
            </p>
          )}

          {accountsQuery.data && accountsQuery.data.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay cuentas. Crea la primera con "Nueva cuenta".
            </p>
          )}

          {accountsQuery.data && accountsQuery.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsQuery.data.map((account) => (
                  <TableRow
                    key={account.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer focus-visible:bg-accent/50 focus-visible:outline-none"
                    onClick={() => navigate(`/accounts/${account.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/accounts/${account.id}`)
                      }
                    }}
                  >
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(account.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
