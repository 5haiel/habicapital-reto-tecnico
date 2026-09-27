import type { Expense, ExpenseShare } from '@/types/api'

/**
 * Equal split of `totalCents` among `participantCount` people plus, if
 * `includePayer`, the payer. Works in integer cents: when the total doesn't
 * divide evenly, the leftover cents go to the payer's own part (if
 * included) or one extra cent to the first participants — so what others
 * owe always adds up exactly, and no cent appears or disappears.
 */
export function splitEqually(totalCents: number, participantCount: number, includePayer: boolean) {
  const people = participantCount + (includePayer ? 1 : 0)
  if (participantCount === 0 || people === 0) return { shares: [], payerPart: 0 }
  // Nobody charges centavos in Colombia: a whole-peso total is split in
  // whole pesos ($100.000 / 3 → 33.333 + 33.333 + 33.334), and only a total
  // that already has centavos is split down to the cent.
  const unit = totalCents % 100 === 0 ? 100 : 1
  const units = totalCents / unit
  const base = Math.floor(units / people)
  const remainder = units - base * people
  if (includePayer) {
    return {
      shares: Array(participantCount).fill(base * unit) as number[],
      payerPart: (base + remainder) * unit,
    }
  }
  return {
    shares: Array.from({ length: participantCount }, (_, i) => (base + (i < remainder ? 1 : 0)) * unit),
    payerPart: 0,
  }
}

export type OwedShare = { expense: Expense; share: ExpenseShare }

/** Shares I still have to pay, oldest first (pay what's been waiting longest). */
export function pendingSharesIOwe(expenses: Expense[], myAccountId: number): OwedShare[] {
  return expenses
    .flatMap((expense) =>
      expense.shares
        .filter((s) => s.account_id === myAccountId && s.status === 'pending')
        .map((share) => ({ expense, share })),
    )
    .reverse()
}

/** Expenses I paid for that still have people pending. */
export function expensesOwedToMe(expenses: Expense[], myAccountId: number): Expense[] {
  return expenses.filter(
    (e) => e.payer_account_id === myAccountId && e.shares.some((s) => s.status === 'pending'),
  )
}

export function pendingTotal(expense: Expense): number {
  return expense.shares.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.amount_owed, 0)
}

export function paidCount(expense: Expense): number {
  return expense.shares.filter((s) => s.status === 'paid').length
}
