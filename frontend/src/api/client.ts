import type { AuthResponse } from './types'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

const ACCESS_KEY = 'tripdrip.access'
const REFRESH_KEY = 'tripdrip.refresh'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type Listener = () => void
const listeners = new Set<Listener>()

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  save(auth: Pick<AuthResponse, 'access_token' | 'refresh_token'>) {
    localStorage.setItem(ACCESS_KEY, auth.access_token)
    localStorage.setItem(REFRESH_KEY, auth.refresh_token)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    listeners.forEach((fn) => fn())
  },
  /** Called when the session ends (refresh failed or logout). */
  onClear(fn: Listener) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

let refreshing: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false
  refreshing ??= fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
    .then(async (res) => {
      if (!res.ok) return false
      tokens.save((await res.json()) as AuthResponse)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    return new ApiError(res.status, body.error?.code ?? 'error', body.error?.message ?? res.statusText)
  } catch {
    return new ApiError(res.status, 'error', res.statusText || 'Request failed')
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  auth?: boolean
}

export async function api<T>(path: string, { method = 'GET', body, query, auth = true }: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }

  const send = () => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`
    return fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  let res = await send()
  if (res.status === 401 && auth) {
    if (await refreshTokens()) {
      res = await send()
    } else {
      tokens.clear()
    }
  }
  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) return 'Server is unreachable'
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}
