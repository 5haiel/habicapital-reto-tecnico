// Mirrors the backend's Pydantic schemas (app/schemas.py). Amounts are
// always integer cents.

export type MovementType = 'deposit' | 'transfer'
export type Direction = 'in' | 'out'
export type ExpenseShareStatus = 'pending' | 'paid'

export interface User {
  id: number
  name: string
  email: string
  account_id: number
  created_at: string
}

export interface UserPublic {
  account_id: number
  name: string
  email: string
}

export interface Account {
  id: number
  name: string
  balance: number
  created_at: string
}

export interface Counterparty {
  account_id: number
  name: string
}

export interface Movement {
  id: number
  type: MovementType
  direction: Direction
  amount: number
  counterparty: Counterparty | null
  description: string | null
  tag: string | null
  created_at: string
}

export interface Tag {
  id: number
  name: string
}

export interface ExpenseShare {
  id: number
  account_id: number
  account_name: string
  amount_owed: number
  status: ExpenseShareStatus
  settlement_movement_id: number | null
}

export interface Expense {
  id: number
  payer_account_id: number
  payer_name: string
  total_amount: number
  description: string | null
  tag: string | null
  created_at: string
  shares: ExpenseShare[]
}

export interface ApiErrorBody {
  detail?: string
  code?: string
  // Present on `validation_error`: which request fields were rejected.
  errors?: { loc?: (string | number)[] }[]
}
