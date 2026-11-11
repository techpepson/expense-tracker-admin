import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginResponse, User } from '@/types'
import { api } from './client'
import { qk } from './queryKeys'
import { useAuthStore } from '@/stores/auth'

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password })
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/api/auth/me')
  return data
}

export function useMe(enabled: boolean) {
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => {
      const u = await fetchMe()
      setUser(u)
      return u
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => loginRequest(email, password),
    onSuccess: (res) => {
      qc.clear()
      setSession(res.token, res.user)
      qc.setQueryData(qk.me, res.user)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const clear = useAuthStore((s) => s.clear)
  return async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      /* token may already be invalid */
    }
    clear()
    qc.clear()
  }
}

