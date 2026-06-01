import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@/types'
import { authApi, setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from '@/services/api'

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
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Issue #2 fix: on page load, try to restore a session via the refresh token
    // stored in sessionStorage. If it works we get a fresh access token (memory)
    // and update the user. If not, we clear everything and stay logged out.
    const refresh = getRefreshToken()
    if (refresh) {
      authApi.refresh(refresh)
        .then(({ data }) => {
          setAccessToken(data.accessToken)
          setRefreshToken(data.refreshToken)  // rotate
          return authApi.me()
        })
        .then(r => setUser(r.data))
        .catch(() => clearTokens())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const saveTokens = (accessToken: string, refreshToken: string) => {
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)
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
    clearTokens()
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
