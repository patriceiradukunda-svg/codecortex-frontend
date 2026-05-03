import axios, { AxiosError } from 'axios'
import { AuthTokens, GenerateRequest, GenerateResponse, ProfileRequest, ProfilingMetrics, PaginatedResponse, Chat, User, AdminStats } from '@/types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000, // 2 min for model inference
})

// ── Auth token injection ──────────────────────────────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Auto token refresh ────────────────────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const orig = err.config as any
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post<AuthTokens>(`${BASE}/api/v1/auth/refresh`, { refreshToken: refresh })
          localStorage.setItem('access_token', data.accessToken)
          orig.headers.Authorization = `Bearer ${data.accessToken}`
          return api(orig)
        } catch {
          localStorage.clear()
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<AuthTokens>('/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),

  googleLogin: (idToken: string) =>
    api.post<AuthTokens>('/auth/google', { idToken }),

  logout: () =>
    api.post('/auth/logout', { refreshToken: localStorage.getItem('refresh_token') }),

  me: () =>
    api.get<User>('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }),
}

// ── Code generation ───────────────────────────────────────────────────────────
export const generateApi = {
  generate: (req: GenerateRequest) =>
    api.post<GenerateResponse>('/generate', req),

  profile: (req: ProfileRequest) =>
    api.post<ProfilingMetrics>('/generate/profile', req),
}

// ── Chats ─────────────────────────────────────────────────────────────────────
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
}

// ── Admin ─────────────────────────────────────────────────────────────────────
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
