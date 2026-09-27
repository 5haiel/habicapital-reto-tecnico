import { useQuery } from '@tanstack/react-query'
import { Check, Clock, HandCoins, Receipt, SplitSquareHorizontal } from 'lucide-react'
import { useState } from 'react'

import { UserAvatar } from '@/components/brand/UserAvatar'
import { EmptyState, ErrorState } from '@/components/EmptyState'
import { NewExpenseDialog, type ExpenseMode } from '@/components/expenses/NewExpenseDialog'
import { PayShareDialog } from '@/components/expenses/PayShareDialog'
import { PageHeader, Panel } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { paidCount, pendingTotal, type OwedShare } from '@/lib/expenses'
import { formatDay } from '@/lib/format'
import { queryKeys } from '@/lib/queryKeys'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import type { Expense, ExpenseShareStatus } from '@/types/api'

type Tab = 'mine' | 'included'

function StatusBadge({ status }: { status: ExpenseShareStatus }) {
  return status === 'paid' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-positive-soft px-2 py-0.5 text-[11px] font-semibold text-positive">
      <Check className="size-3" strokeWidth={3} aria-hidden /> Pagado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
      <Clock className="size-3" aria-hidden /> Pendiente
    </span>
  )
}

function ExpenseMeta({ expense }: { expense: Expense }) {
  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      {formatDay(expense.created_at)}
      {expense.tag && <> · #{expense.tag}</>}
    </p>
  )
}

function PaidByMeCard({ expense }: { expense: Expense }) {
  const paid = paidCount(expense)
  const pending = pendingTotal(expense)
  return (
    <li className="py-5 first:pt-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{expense.description ?? 'Gasto compartido'}</p>
          <ExpenseMeta expense={expense} />
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Te deben</p>
          <p className="amount font-semibold">{formatCurrency(expense.total_amount)}</p>
          <p className="text-xs text-muted-foreground">
            {pending > 0 ? <>Falta <span className="amount">{formatCurrency(pending)}</span></> : 'Todos pagaron'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', pending === 0 ? 'bg-positive' : 'bg-primary')}
            style={{ width: `${(paid / expense.shares.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {paid}/{expense.shares.length}
        </span>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {expense.shares.map((share) => (
          <li key={share.id} className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2">
            <UserAvatar name={share.account_name} className="size-7 text-[10px]" />
            <span className="min-w-0 flex-1 truncate text-sm">{share.account_name}</span>
            <span className="amount text-sm">{formatCurrency(share.amount_owed)}</span>
            <StatusBadge status={share.status} />
          </li>
        ))}
      </ul>
    </li>
  )
}

export default function ExpensesPage() {
  useDocumentTitle('Gastos compartidos')
  const { user } = useSession()
  const expenses = useQuery({ queryKey: queryKeys.expenses, queryFn: api.expenses.list })
  const [tab, setTab] = useState<Tab>('included')
  const [dialogMode, setDialogMode] = useState<ExpenseMode>('split')
  const [dialogOpen, setDialogOpen] = useState(false)
  const openDialog = (mode: ExpenseMode) => {
    setDialogMode(mode)
    setDialogOpen(true)
  }
  const [payTarget, setPayTarget] = useState<OwedShare | null>(null)

  if (!user) return null
  const me = user.account_id
  const paidByMe = (expenses.data ?? []).filter((e) => e.payer_account_id === me)
  const included: OwedShare[] = (expenses.data ?? []).flatMap((expense) =>
    expense.shares.filter((s) => s.account_id === me).map((share) => ({ expense, share })),
  )
  // Pending first, then most recent.
  included.sort((a, b) => Number(a.share.status === 'paid') - Number(b.share.status === 'paid'))
  const pendingCount = included.filter((i) => i.share.status === 'pending').length

  return (
    <>
      <PageHeader
        title="Gastos compartidos"
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => openDialog('charge')}>
              <HandCoins />
              Cobrar
            </Button>
            <Button size="lg" onClick={() => openDialog('split')}>
              <SplitSquareHorizontal />
              Dividir gasto
            </Button>
          </>
        }
      />

      <Panel>
        <div className="border-b pb-5">
          <Segmented
            label="Ver gastos"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: 'included', label: pendingCount ? `Te incluyeron (${pendingCount})` : 'Te incluyeron' },
              { value: 'mine', label: 'Pagaste tú' },
            ]}
          />
        </div>

        {expenses.isPending ? (
          <div className="space-y-3 pt-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : expenses.isError ? (
          <ErrorState onRetry={() => expenses.refetch()} />
        ) : tab === 'included' ? (
          included.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nadie te ha incluido en un gasto"
              description="Cuando alguien divida un gasto contigo o te cobre, aparecerá aquí."
            />
          ) : (
            <ul className="divide-y">
              {included.map((item) => (
                <li key={item.share.id} className="flex flex-wrap items-center gap-3 py-4">
                  <UserAvatar name={item.expense.payer_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.expense.description ?? 'Gasto compartido'}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Pagó {item.expense.payer_name} · {formatDay(item.expense.created_at)}
                      {item.expense.tag && <> · #{item.expense.tag}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="amount font-semibold">{formatCurrency(item.share.amount_owed)}</p>
                      <StatusBadge status={item.share.status} />
                    </div>
                    {item.share.status === 'pending' && (
                      <Button onClick={() => setPayTarget(item)}>Pagar</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : paidByMe.length === 0 ? (
          <EmptyState
            icon={SplitSquareHorizontal}
            title="No has dividido ningún gasto"
            description="Registra lo que pagaste por otros y cada quien paga su parte desde su cuenta."
            action={<Button onClick={() => openDialog('split')}>Dividir un gasto</Button>}
          />
        ) : (
          <ul className="divide-y">
            {paidByMe.map((e) => (
              <PaidByMeCard key={e.id} expense={e} />
            ))}
          </ul>
        )}
      </Panel>

      <NewExpenseDialog key={dialogMode} mode={dialogMode} open={dialogOpen} onOpenChange={setDialogOpen} />
      <PayShareDialog target={payTarget} onClose={() => setPayTarget(null)} />
    </>
  )
}
