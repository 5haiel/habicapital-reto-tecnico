import type {
  Account,
  ApiErrorBody,
  Expense,
  ExpenseShare,
  Movement,
  Tag,
  User,
  UserPublic,
} from '@/types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  status: number
  code: string
  /** Body fields the backend rejected (e.g. "email"), so forms can flag the right input. */
  fields: string[]

  constructor(message: string, status: number, code: string, fields: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

/** Spanish, user-facing message for any error thrown by a request. */
export function errorMessage(error: unknown, fallback = 'Algo salió mal. Intenta de nuevo.') {
  return error instanceof ApiError ? error.message : fallback
}

// Called on any 401 from an authenticated request (session expired or
// revoked mid-use). Set by the auth layer; kept here so every request goes
// through one place instead of each screen handling expiry on its own.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      // The session lives in an httpOnly cookie the page can't read; the
      // browser attaches it because the API is same-origin (/api proxy).
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(
      'No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.',
      0,
      'network_error',
    )
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    const fields = (body?.errors ?? [])
      .map((e) => e.loc)
      .filter((loc): loc is (string | number)[] => loc?.[0] === 'body' && loc.length > 1)
      .map((loc) => String(loc[1]))
    const error = new ApiError(
      body?.detail ?? 'Algo salió mal. Intenta de nuevo.',
      response.status,
      body?.code ?? 'unknown_error',
      fields,
    )
    // Login answers 401 for bad credentials: a form error, not an expired session.
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      onUnauthorized?.()
    }
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

// One key per user *action*, not per HTTP attempt: callers create it when
// the form opens and reuse it for every retry of that same submit, so a
// double click or a retry after a timeout can never move money twice. A
// new key is created only after the action succeeds.
export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

const json = (body: unknown) => JSON.stringify(body)

export const api = {
  auth: {
    session: () => request<{ user: User | null }>('/auth/session'),
    login: (email: string, password: string) =>
      request<User>('/auth/login', { method: 'POST', body: json({ email, password }) }),
    register: (payload: { name: string; email: string; password: string }) =>
      request<User>('/auth/register', { method: 'POST', body: json(payload) }),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
    updateProfile: (payload: { name?: string; email?: string }) =>
      request<User>('/auth/me', { method: 'PATCH', body: json(payload) }),
    changePassword: (payload: { current_password: string; new_password: string }) =>
      request<void>('/auth/me/password', { method: 'POST', body: json(payload) }),
  },
  me: {
    account: () => request<Account>('/me/account'),
    movements: () => request<Movement[]>('/me/movements'),
  },
  users: {
    search: (q: string) => request<UserPublic[]>(`/users/search?q=${encodeURIComponent(q)}`),
  },
  movements: {
    deposit: (
      payload: { amount: number; description?: string; tag?: string },
      idempotencyKey: string,
    ) =>
      request<Movement>('/movements/deposit', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: json(payload),
      }),
    transfer: (
      payload: { to_account_id: number; amount: number; description?: string; tag?: string },
      idempotencyKey: string,
    ) =>
      request<Movement>('/movements/transfer', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: json(payload),
      }),
  },
  tags: {
    list: () => request<Tag[]>('/tags'),
  },
  expenses: {
    list: () => request<Expense[]>('/expenses'),
    create: (payload: {
      shares: { account_id: number; amount_owed: number }[]
      description?: string
      tag?: string
    }) => request<Expense>('/expenses', { method: 'POST', body: json(payload) }),
    settleShare: (expenseId: number, shareId: number) =>
      request<ExpenseShare>(`/expenses/${expenseId}/shares/${shareId}/settle`, {
        method: 'POST',
      }),
  },
}
