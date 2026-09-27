import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { ApiError, newIdempotencyKey } from '@/lib/api'
import { moneyKeys } from '@/lib/queryKeys'

/**
 * A money-moving mutation with a stable Idempotency-Key. The key lives as
 * long as the *intent* (the open form), so a double click, a retry after a
 * timeout, or re-submitting after an error all reuse it and the backend
 * executes the operation at most once. It's replaced only after a success
 * (next operation is a new intent) or when the backend says the key was
 * already used for a different operation.
 */
export function useMoneyAction<TVars, TResult>(
  request: (vars: TVars, idempotencyKey: string) => Promise<TResult>,
) {
  const client = useQueryClient()
  const [key, setKey] = useState(newIdempotencyKey)

  return useMutation({
    mutationFn: (vars: TVars) => request(vars, key),
    onSuccess: () => {
      setKey(newIdempotencyKey())
      for (const queryKey of moneyKeys) client.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'idempotency_key_conflict') {
        setKey(newIdempotencyKey())
      }
    },
  })
}
