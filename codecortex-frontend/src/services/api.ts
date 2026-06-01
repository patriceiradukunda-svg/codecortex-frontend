/**
 * api.ts — Axios client with secure token management
 *
 * Issue #2 fix: tokens are no longer stored in localStorage (XSS-readable).
 * - accessToken  → in-memory variable only (lost on page refresh, which is fine
 *                  because the refresh flow re-issues it automatically)
 * - refreshToken → sessionStorage (scoped to the browser tab; not accessible
 *                  to other origins; still survives soft navigation)
 *
 * For the strongest posture, move the refresh token to an HttpOnly cookie set
 * by the backend. That requires a backend change to POST /auth/refresh without
 * a body (the cookie is sent automatically by the browser). The comment in
 * auth.py already describes that upgrade path.
 */
import axios, { AxiosError } from 'axios'
import {
  AuthTokens, GenerateRequest, GenerateResponse,
  ProfileRequest, ProfilingMetrics, PaginatedResponse,
  Chat, User, AdminStats,
} from '@/types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Issue #2 fix: access token lives only in memory ──────────────────────────
let _accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

// Refresh token in sessionStorage (tab-scoped, not cross-origin readable)
export function setRefreshToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem('refresh_token', token)
  } else {
    sessionStorage.removeItem('refresh_token')
  }
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem('refresh_token')
}

export function clearTokens(): void {
  _accessToken = null
  sessionStorage.removeItem('refresh_token')
}

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
})

api.interceptors.request.use(cfg => {
  const token = getAccessToken()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const orig = err.config as any
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      const refresh = getRefreshToken()
      if (refresh) {
        try {
          const { data } = await axios.post<AuthTokens>(
            `${BASE}/api/v1/auth/refresh`,
            { refreshToken: refresh },
          )
          // Issue #2 fix: store new access token in memory, rotate refresh token
          setAccessToken(data.accessToken)
          setRefreshToken(data.refreshToken)
          orig.headers.Authorization = `Bearer ${data.accessToken}`
          return api(orig)
        } catch {
          clearTokens()
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(err)
  },
)

// ── API modules ───────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<AuthTokens>('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),
  googleLogin: (idToken: string) =>
    api.post<AuthTokens>('/auth/google', { idToken }),
  logout: () =>
    api.post('/auth/logout', { refreshToken: getRefreshToken() }),
  me: () =>
    api.get<User>('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }),
}

export const generateApi = {
  generate: (req: GenerateRequest) =>
    api.post<GenerateResponse>('/generate', req),
  profile: (req: ProfileRequest) =>
    api.post<ProfilingMetrics>('/generate/profile', req),
}

export const chatsApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<PaginatedResponse<Chat>>('/chats', { params: { page, pageSize } }),
  get: (id: string) =>
    api.get<Chat>(`/chats/${id}`),
  create: (title?: string) =>
    api.post<Chat>('/chats', { title: title || 'New Chat' }),
  delete: (id: string) =>
    api.delete(`/chats/${id}`),
  rename: (id: string, title: string) =>
    api.patch<Chat>(`/chats/${id}`, { title }),
  deleteMessage: (chatId: string, messageId: string) =>
    api.delete(`/chats/${chatId}/messages/${messageId}`),
  editMessage: (chatId: string, messageId: string, content: string) =>
    api.patch<Chat>(`/chats/${chatId}/messages/${messageId}`, { content }),
}

export const adminApi = {
  stats: () =>
    api.get<AdminStats>('/admin/stats'),
  users: (page = 1, pageSize = 20, search?: string) =>
    api.get<PaginatedResponse<User>>('/admin/users', { params: { page, pageSize, search } }),
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),
  promoteUser: (id: string) =>
    api.patch(`/admin/users/${id}/role`, { role: 'admin' }),
  chats: (page = 1) =>
    api.get<PaginatedResponse<Chat>>('/admin/chats', { params: { page } }),
}

export default api
