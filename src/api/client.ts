import axios, { AxiosError } from 'axios'
import type { ApiErrorBody } from '@/types'
import { env } from '@/lib/env'
import { useAuthStore } from '@/stores/auth'

/**
 * Shared Axios instance. Auth is a Bearer token in the Authorization header — no cookies,
 * so the admin app can live on a different domain from the employee app.
 */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { Accept: 'application/json' },
  withCredentials: false,
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

type UnauthorizedListener = () => void
let onUnauthorized: UnauthorizedListener | null = null
export function setUnauthorizedHandler(fn: UnauthorizedListener | null): void {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status
    const isLogin = error.config?.url?.includes('/api/auth/login')
    const code = error.response?.data?.code
    // 401 anywhere (or a non-admin token on a protected route) ends the session.
    if (!isLogin && (status === 401 || (status === 403 && code === 'employee_account'))) {
      useAuthStore.getState().clear()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

export class ApiError extends Error {
  status: number
  code?: string
  fieldErrors: Record<string, string[]>
  constructor(message: string, status: number, code?: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    const data = err.response?.data
    if (!err.response) return new ApiError('Cannot reach the server. Check your connection.', 0, 'network_error')
    return new ApiError(data?.message ?? err.message, err.response.status, data?.code, data?.errors ?? {})
  }
  return new ApiError(err instanceof Error ? err.message : 'Something went wrong', 0)
}

export function errorMessage(err: unknown): string {
  return toApiError(err).message
}

