export type MovementType = 'deposit' | 'transfer'
export type ExpenseShareStatus = 'pending' | 'paid'

export interface Account {
  id: number
  name: string
  balance: number
  is_external: boolean
  created_at: string
}

export interface Movement {
  id: number
  type: MovementType
  from_account_id: number
  to_account_id: number
  amount: number
  description: string | null
  tag: string | null
  idempotency_key: string
  created_at: string
}

export interface Tag {
  id: number
  name: string
}

export interface ExpenseShare {
  id: number
  account_id: number
  amount_owed: number
  status: ExpenseShareStatus
  settlement_movement_id: number | null
}

export interface Expense {
  id: number
  payer_account_id: number
  total_amount: number
  description: string | null
  tag: string | null
  created_at: string
  shares: ExpenseShare[]
}

export interface ApiErrorBody {
  detail?: string
}
