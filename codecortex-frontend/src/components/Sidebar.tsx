import { useEffect, useState } from 'react'
import {
  Brain, Plus, MessageSquare, Trash2, Settings,
  Shield, LogOut, User as UserIcon, X, Search,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useChat } from '@/contexts/ChatContext'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'

interface SidebarProps {
  onOpenAuth: (mode: 'login' | 'register') => void
  onOpenSettings: () => void
  onClose?: () => void
}

function formatTime(timestamp: any): string {
  try {
    if (!timestamp) return ''
    if (typeof timestamp === 'object' && timestamp !== null) {
      const val = timestamp.$date ?? timestamp.date ?? Object.values(timestamp)[0]
      if (!val) return ''
      const d = new Date(String(val))
      if (isNaN(d.getTime())) return ''
      return formatDistanceToNow(d, { addSuffix: true })
    }
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return ''
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return ''
  }
}

export default function Sidebar({ onOpenAuth, onOpenSettings, onClose }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth()
  const { chats, activeChat, loadChats, newChat, selectChat, deleteChat } = useChat()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) loadChats()
  }, [user])

  const filtered = chats.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (id: string) => {
    selectChat(id)
    onClose?.()
  }

  return (
    <div className="w-[280px] bg-[#0f0f0f] border-r border-[#2c2c2c] flex flex-col h-full">

      {/* ── Header ── */}
      <div className="px-4 py-4 border-b border-[#2c2c2c] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-[#9B5A1A] flex items-center gap-2">
            <Brain size={18} /> CodeCortex Pro
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5">AI · Embedded Vision · Profiling</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── New Chat ── */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={user ? newChat : () => onOpenAuth('login')}
          className="w-full bg-[#7B3F00] hover:bg-[#9B5A1A] text-white font-semibold rounded-xl
                     py-2.5 flex items-center justify-center gap-2 text-sm transition-all duration-200
                     active:scale-95"
        >
          <Plus size={15} /> New Chat
        </button>
      </div>

      {/* ── Search — fix #11 ── */}
      {user && chats.length > 2 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full bg-[#1a1a1a] border border-[#2c2c2c] rounded-lg pl-8 pr-3 py-1.5
                         text-xs text-white placeholder:text-gray-600 outline-none
                         focus:border-[#7B3F00]/60 transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── Chat list ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {!user && (
          <p className="text-xs text-gray-600 text-center py-8 px-3 leading-relaxed">
            Sign in to save and access your chat history
          </p>
        )}

        {filtered.length === 0 && search && (
          <p className="text-xs text-gray-600 text-center py-6">No chats match "{search}"</p>
        )}

        {filtered.map(chat => {
          const isEmpty = chat.messages?.length === 0
          const isActive = activeChat?.id === chat.id
          return (
            <div
              key={chat.id}
              onClick={() => handleSelect(chat.id)}
              title={chat.title}
              className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                transition-all duration-150 relative
                ${isActive
                  ? 'bg-[#1e1e1e] border-l-2 border-[#9B5A1A]'
                  : 'border-l-2 border-transparent hover:bg-[#181818]'
                }`}
            >
              <MessageSquare size={13} className={`mt-0.5 shrink-0 ${isActive ? 'text-[#9B5A1A]' : 'text-gray-600'}`} />
              <div className="flex-1 min-w-0">
                {/* Fix #4: allow 2 lines instead of hard truncate */}
                <p className={`text-xs font-medium leading-snug line-clamp-2
                  ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                  {chat.title}
                  {isEmpty && (
                    <span className="ml-1 text-[9px] text-[#7B3F00] bg-[#7B3F00]/10 px-1.5 py-0.5 rounded-full align-middle">
                      empty
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-700 mt-0.5">{formatTime(chat.updatedAt)}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 text-gray-700
                           hover:text-red-400 transition-all mt-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── User area ── */}
      <div className="p-3 border-t border-[#2c2c2c] shrink-0">
        {user ? (
          <div className="bg-[#1a1a1a] rounded-xl p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#7B3F00] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name || user.email}</p>
                <p className="text-[10px] text-gray-600 capitalize">{user.role}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex-1 border border-[#2c2c2c] hover:bg-[#2c2c2c] text-gray-400 hover:text-white
                             rounded-lg py-1.5 text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Shield size={11} /> Admin
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className="flex-1 border border-[#2c2c2c] hover:bg-[#2c2c2c] text-gray-400 hover:text-white
                           rounded-lg py-1.5 text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Settings size={11} /> Settings
              </button>
              <button
                onClick={logout}
                className="flex-1 border border-[#2c2c2c] hover:border-red-900 hover:bg-red-950/30
                           text-gray-400 hover:text-red-400 rounded-lg py-1.5 text-xs
                           flex items-center justify-center gap-1 transition-all"
              >
                <LogOut size={11} /> Out
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-gray-600 text-xs pb-0.5">
              <UserIcon size={13} /> Guest Mode
            </div>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full bg-[#7B3F00] hover:bg-[#9B5A1A] text-white font-semibold
                         rounded-lg py-2 text-xs transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full border border-[#2c2c2c] hover:bg-[#2c2c2c] text-gray-400
                         hover:text-white rounded-lg py-2 text-xs transition-all"
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
