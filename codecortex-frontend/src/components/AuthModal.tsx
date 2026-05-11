import { useState } from 'react'
import { X, Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, Brain } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'

interface AuthModalProps {
  mode: 'login' | 'register'
  onClose: () => void
  onSwitchMode: (m: 'login' | 'register') => void
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { login, register, googleLogin } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) return toast.error('All fields required')
    if (mode === 'register' && !name) return toast.error('Name is required')
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, name)
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse: any) => {
    setLoading(true)
    try {
      await googleLogin(credentialResponse.credential)
      toast.success('Signed in with Google!')
      onClose()
    } catch {
      toast.error('Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-[400px] animate-slide-up"
        style={{
          background: 'linear-gradient(160deg, #1a1a1a 0%, #141414 100%)',
          border: '1px solid #2a2a2a',
          borderRadius: '24px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(192,106,26,0.08)',
        }}
      >
        {/* ── Top accent bar ── */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #C06A1A, transparent)' }}
        />

        <div className="p-7">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* Brand icon */}
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-xl blur-md"
                  style={{ background: 'rgba(192,106,26,0.3)' }}
                />
                <div
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(192,106,26,0.25), rgba(224,120,32,0.1))',
                    border: '1px solid rgba(192,106,26,0.3)',
                  }}
                >
                  <Brain size={18} className="text-[#E07820]" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  {mode === 'login'
                    ? 'Sign in to your CodeCortex account'
                    : 'Join CodeCortex Pro today'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Google ── */}
          <div
            className="rounded-2xl p-3 mb-4 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a2a' }}
          >
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => toast.error('Google sign-in failed')}
              theme="filled_black"
              shape="pill"
              size="large"
              text={mode === 'login' ? 'signin_with' : 'signup_with'}
            />
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
            <span className="text-[11px] text-[#4B5563] font-medium px-1">or continue with email</span>
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
          </div>

          {/* ── Form fields ── */}
          <div className="space-y-3 mb-4">
            {mode === 'register' && (
              <div className="relative">
                <UserIcon
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none"
                />
                <input
                  className="w-full pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#4B5563]
                             outline-none rounded-xl transition-all"
                  style={{
                    background: '#111',
                    border: '1px solid #2a2a2a',
                  }}
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(192,106,26,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                />
              </div>
            )}

            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none"
              />
              <input
                className="w-full pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-[#4B5563]
                           outline-none rounded-xl transition-all"
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                }}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(192,106,26,0.6)'}
                onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              />
            </div>

            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none"
              />
              <input
                className="w-full pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-[#4B5563]
                           outline-none rounded-xl transition-all"
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                }}
                type={showPwd ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(192,106,26,0.6)'}
                onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* ── Submit button ── */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white
                       flex items-center justify-center gap-2 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background: loading
                ? '#C06A1A'
                : 'linear-gradient(135deg, #C06A1A 0%, #E07820 100%)',
              boxShadow: '0 4px 20px rgba(192,106,26,0.35)',
            }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {/* ── Switch mode ── */}
          <p className="text-center text-xs text-[#6B7280] mt-4">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="font-semibold transition-colors hover:underline"
              style={{ color: '#E07820' }}
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
