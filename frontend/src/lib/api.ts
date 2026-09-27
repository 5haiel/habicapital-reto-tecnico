import type {
  Account,
  ApiErrorBody,
  Expense,
  Movement,
  Tag,
} from '@/types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      body?.detail ?? `Request failed with status ${response.status}`,
      response.status,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// A fresh key per user action — not per component render — so a retry of
// the exact same submit reuses the request's own identity and the backend
// treats it as one attempt, not two. See the backend's Idempotency-Key
// convention in decisions.md.
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

export const api = {
  accounts: {
    list: () => request<Account[]>('/accounts'),
    get: (id: number) => request<Account>(`/accounts/${id}`),
    create: (name: string) =>
      request<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    movements: (id: number) => request<Movement[]>(`/accounts/${id}/movements`),
  },
  movements: {
    deposit: (
      payload: { to_account_id: number; amount: number; description?: string; tag?: string },
      idempotencyKey: string,
    ) =>
      request<Movement>('/movements/deposit', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      }),
    transfer: (
      payload: {
        from_account_id: number
        to_account_id: number
        amount: number
        description?: string
        tag?: string
      },
      idempotencyKey: string,
    ) =>
      request<Movement>('/movements/transfer', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      }),
  },
  tags: {
    list: () => request<Tag[]>('/tags'),
  },
  expenses: {
    list: () => request<Expense[]>('/expenses'),
    get: (id: number) => request<Expense>(`/expenses/${id}`),
    create: (payload: {
      payer_account_id: number
      shares: { account_id: number; amount_owed: number }[]
      description?: string
      tag?: string
    }) =>
      request<Expense>('/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    settleShare: (expenseId: number, shareId: number) =>
      request<Expense['shares'][number]>(
        `/expenses/${expenseId}/shares/${shareId}/settle`,
        { method: 'POST' },
      ),
  },
}
