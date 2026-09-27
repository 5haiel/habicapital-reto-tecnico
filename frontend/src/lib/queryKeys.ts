// Every cache key in one place, so invalidating "whatever depends on my
// money" after a mutation can't miss a screen.
export const queryKeys = {
  me: ['me'] as const,
  account: ['me', 'account'] as const,
  movements: ['me', 'movements'] as const,
  expenses: ['expenses'] as const,
  tags: ['tags'] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
}

/** Keys whose data changes whenever money moves. */
export const moneyKeys = [queryKeys.account, queryKeys.movements, queryKeys.expenses, queryKeys.tags]
