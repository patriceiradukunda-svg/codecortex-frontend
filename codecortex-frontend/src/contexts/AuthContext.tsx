import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/types'
import { authApi } from '@/services/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi.me()
        .then(r => setUser(r.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const saveTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password)
    saveTokens(data.accessToken, data.refreshToken)
    const me = await authApi.me()
    setUser(me.data)
  }

  const register = async (email: string, password: string, name: string) => {
    const { data } = await authApi.register(email, password, name)
    saveTokens(data.accessToken, data.refreshToken)
    const me = await authApi.me()
    setUser(me.data)
  }

  const googleLogin = async (idToken: string) => {
    const { data } = await authApi.googleLogin(idToken)
    saveTokens(data.accessToken, data.refreshToken)
    const me = await authApi.me()
    setUser(me.data)
  }

  const logout = async () => {
    await authApi.logout().catch(() => {})
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, googleLogin, logout,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
