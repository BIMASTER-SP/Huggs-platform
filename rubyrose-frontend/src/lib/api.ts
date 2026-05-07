/**
 * API client.
 *
 * Single source of truth for HTTP calls to the Ruby Rose backend.
 * After PR 1 (security hardening) the backend handles auth via Bearer JWT only —
 * no more Basic Auth tunnel header. The token is read from localStorage at
 * request time so AuthContext can mutate it without re-mounting consumers.
 */

import type { ApiResponse } from './types'

const TOKEN_KEY = 'auth_token'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const auth = authHeaders() as Record<string, string>
  for (const [k, v] of Object.entries(auth)) headers.set(k, v)

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
  }

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await res.json()) as ApiResponse<T>
  } catch {
    /* empty body or non-JSON */
  }

  if (!res.ok) {
    const message = payload?.message || payload?.detail || `Erro ${res.status}`
    throw new ApiError(res.status, message, payload)
  }

  // Backend wraps responses in { status, message, data, ... }; unwrap to T.
  return (payload?.data ?? (payload as unknown)) as T
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}
