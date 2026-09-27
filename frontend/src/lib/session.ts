import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'
import type { User } from '@/types/api'

/** Drops every cached query (another user's data must never linger) and marks the visitor as signed out. */
export function clearSession() {
  queryClient.clear()
  queryClient.setQueryData(queryKeys.me, null)
}

// /auth/session answers 200 with `user: null` when signed out, so a
// visitor without a session never produces a failed request.
async function fetchCurrentUser(): Promise<User | null> {
  return (await api.auth.session()).user
}

/** The signed-in user, `null` when signed out, `undefined` while still checking. */
export function useSession() {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  })
  return { user: query.data, isLoading: query.isPending, isError: query.isError }
}

function useStartSession() {
  const client = useQueryClient()
  return (user: User) => {
    client.clear()
    client.setQueryData(queryKeys.me, user)
  }
}

export function useLogin() {
  const start = useStartSession()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.login(email, password),
    onSuccess: start,
  })
}

export function useRegister() {
  const start = useStartSession()
  return useMutation({ mutationFn: api.auth.register, onSuccess: start })
}

export function useLogout() {
  return useMutation({
    mutationFn: api.auth.logout,
    // Signed out locally even if the request fails: the user asked to leave.
    onSettled: clearSession,
  })
}
