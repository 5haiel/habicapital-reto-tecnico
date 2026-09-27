import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Plus, Receipt, Send, SplitSquareHorizontal, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { UserAvatar } from '@/components/brand/UserAvatar'
import { EmptyState, ErrorState } from '@/components/EmptyState'
import { NewExpenseDialog } from '@/components/expenses/NewExpenseDialog'
import { PayShareDialog } from '@/components/expenses/PayShareDialog'
import { Panel } from '@/components/layout/PageHeader'
import { DepositDialog } from '@/components/money/DepositDialog'
import { MovementList, MovementListSkeleton } from '@/components/money/MovementList'
import { SendMoneyDialog } from '@/components/money/SendMoneyDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { expensesOwedToMe, paidCount, pendingSharesIOwe, pendingTotal, type OwedShare } from '@/lib/expenses'
import { firstName, greeting } from '@/lib/format'
import { queryKeys } from '@/lib/queryKeys'
import { useSession } from '@/lib/session'
import type { Movement } from '@/types/api'

function monthTotals(movements: Movement[], now = new Date()) {
  let incoming = 0
  let outgoing = 0
  for (const m of movements) {
    const d = new Date(m.created_at)
    if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
    if (m.direction === 'in') incoming += m.amount
    else outgoing += m.amount
  }
  return { incoming, outgoing }
}

export default function HomePage() {
  useDocumentTitle('Inicio')
  const { user } = useSession()
  const account = useQuery({ queryKey: queryKeys.account, queryFn: api.me.account })
  const movements = useQuery({ queryKey: queryKeys.movements, queryFn: api.me.movements })
  const expenses = useQuery({ queryKey: queryKeys.expenses, queryFn: api.expenses.list })

  const [sendOpen, setSendOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [payTarget, setPayTarget] = useState<OwedShare | null>(null)

  if (!user) return null
  const iOwe = expenses.data ? pendingSharesIOwe(expenses.data, user.account_id) : []
  const owedToMe = expenses.data ? expensesOwedToMe(expenses.data, user.account_id) : []
  const totals = movements.data ? monthTotals(movements.data) : null
  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date())

  return (
    <>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-2xl font-bold sm:text-[1.75rem]">{firstName(user.name)}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-float sm:p-8" aria-label="Tu saldo">
            <p className="text-sm text-white/75">Saldo disponible</p>
            {account.isPending ? (
              <Skeleton className="mt-2 h-11 w-56 bg-white/20" />
            ) : account.isError ? (
              <p className="mt-2 text-sm text-white/85">No pudimos cargar tu saldo.</p>
            ) : (
              <p className="amount mt-1 text-[2.5rem] leading-tight font-bold sm:text-5xl">
                {formatCurrency(account.data.balance)}
              </p>
            )}
            {totals && (
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
                <div className="flex gap-1.5">
                  <dt>Entró en {monthName}:</dt>
                  <dd className="amount font-semibold text-white">{formatCurrency(totals.incoming)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>Salió:</dt>
                  <dd className="amount font-semibold text-white">{formatCurrency(totals.outgoing)}</dd>
                </div>
              </dl>
            )}
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Button variant="inverse" size="lg" onClick={() => setSendOpen(true)}>
                <Send />
                Enviar
              </Button>
              <Button variant="inverse-outline" size="lg" onClick={() => setDepositOpen(true)}>
                <Plus />
                Cargar saldo
              </Button>
              <Button variant="inverse-outline" size="lg" onClick={() => setSplitOpen(true)}>
                <SplitSquareHorizontal />
                Dividir gasto
              </Button>
            </div>
          </section>

          <Panel
            title="Movimientos recientes"
            action={
              movements.data && movements.data.length > 0 ? (
                <Link to="/historial" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  Ver todo <ArrowRight className="size-4" />
                </Link>
              ) : null
            }
          >
            {movements.isPending ? (
              <MovementListSkeleton />
            ) : movements.isError ? (
              <ErrorState onRetry={() => movements.refetch()} />
            ) : movements.data.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Aún no tienes movimientos"
                description="Carga saldo para empezar a enviar, cobrar y dividir gastos."
                action={<Button onClick={() => setDepositOpen(true)}>Cargar saldo</Button>}
              />
            ) : (
              <MovementList movements={movements.data.slice(0, 5)} />
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Por pagar">
            {expenses.isPending ? (
              <Skeleton className="mt-2 h-16 w-full" />
            ) : expenses.isError ? (
              <ErrorState onRetry={() => expenses.refetch()} />
            ) : iOwe.length === 0 ? (
              <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-positive" aria-hidden />
                Estás al día. No tienes cobros pendientes.
              </p>
            ) : (
              <ul className="divide-y">
                {iOwe.map((item) => (
                  <li key={item.share.id} className="flex items-center gap-3 py-3">
                    <UserAvatar name={item.expense.payer_name} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.expense.description ?? 'Gasto compartido'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        A {item.expense.payer_name} · <span className="amount">{formatCurrency(item.share.amount_owed)}</span>
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setPayTarget(item)}>
                      Pagar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Te deben"
            action={
              owedToMe.length > 0 ? (
                <Link to="/gastos" className="text-sm font-semibold text-primary hover:underline">
                  Ver gastos
                </Link>
              ) : null
            }
          >
            {expenses.isPending ? (
              <Skeleton className="mt-2 h-16 w-full" />
            ) : expenses.isError ? null : owedToMe.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nadie te debe nada"
                description="¿Pagaste algo por otros? Divide el gasto y cada quien paga su parte."
              />
            ) : (
              <ul className="divide-y">
                {owedToMe.map((e) => (
                  <li key={e.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{e.description ?? 'Gasto compartido'}</p>
                      <p className="amount shrink-0 text-sm font-semibold">{formatCurrency(pendingTotal(e))}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {paidCount(e)} de {e.shares.length} pagaron
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(paidCount(e) / e.shares.length) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <SendMoneyDialog open={sendOpen} onOpenChange={setSendOpen} />
      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
      <NewExpenseDialog mode="split" open={splitOpen} onOpenChange={setSplitOpen} />
      <PayShareDialog target={payTarget} onClose={() => setPayTarget(null)} />
    </>
  )
}
