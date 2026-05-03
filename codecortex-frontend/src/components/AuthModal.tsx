import { useState } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-[340px] p-6 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Google */}
        <div className="mb-4 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogle}
            onError={() => toast.error('Google sign-in failed')}
            theme="filled_black"
            shape="pill"
            size="large"
            text={mode === 'login' ? 'signin_with' : 'signup_with'}
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-gray-600">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Form */}
        <div className="space-y-3">
          {mode === 'register' && (
            <input
              className="input-dark"
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          <input
            className="input-dark"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              className="input-dark pr-10"
              type={showPwd ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-choco w-full py-2.5 mt-4 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
            className="text-choco-light hover:underline"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
