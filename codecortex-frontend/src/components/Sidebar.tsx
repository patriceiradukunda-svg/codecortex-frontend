import { useEffect } from 'react'
import { Brain, Plus, MessageSquare, Trash2, Settings, Shield, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useChat } from '@/contexts/ChatContext'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'

interface SidebarProps {
  onOpenAuth: (mode: 'login' | 'register') => void
  onOpenSettings: () => void
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

export default function Sidebar({ onOpenAuth, onOpenSettings }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth()
  const { chats, activeChat, loadChats, newChat, selectChat, deleteChat } = useChat()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) loadChats()
  }, [user])

  return (
    <div className="w-[280px] bg-sidebar border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-choco-light flex items-center gap-2">
          <Brain size={22} /> CodeCortex Pro
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">AI · Embedded Vision · Profiling</p>
      </div>

      {/* New chat */}
      <button
        onClick={user ? newChat : () => onOpenAuth('login')}
        className="btn-choco mx-4 my-3 py-2.5 flex items-center justify-center gap-2 text-sm"
      >
        <Plus size={16} /> New Chat
      </button>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {!user && (
          <p className="text-xs text-gray-500 text-center py-6 px-2">
            Sign in to save and view your chat history
          </p>
        )}
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => selectChat(chat.id)}
            className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer
              border-l-2 text-sm transition-all duration-150
              ${activeChat?.id === chat.id
                ? 'bg-card border-choco-light text-white'
                : 'border-transparent text-gray-400 hover:bg-card hover:text-white'
              }`}
          >
            <MessageSquare size={14} className="mt-0.5 shrink-0 text-choco-light" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-xs">{chat.title}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {formatTime(chat.updatedAt ?? chat.updated_at)}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* User area */}
      <div className="p-3 border-t border-border">
        {user ? (
          <div className="bg-card rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-choco flex items-center justify-center text-white text-xs font-bold">
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name || user.email}</p>
                <p className="text-[10px] text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex-1 btn-outline py-1.5 text-xs flex items-center justify-center gap-1"
                >
                  <Shield size={12} /> Admin
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className="flex-1 btn-outline py-1.5 text-xs flex items-center justify-center gap-1"
              >
                <Settings size={12} /> Settings
              </button>
              <button
                onClick={logout}
                className="flex-1 btn-outline py-1.5 text-xs flex items-center justify-center gap-1 hover:border-red-600 hover:text-red-400"
              >
                <LogOut size={12} /> Out
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs pb-1">
              <UserIcon size={14} /> Guest Mode
            </div>
            <button onClick={() => onOpenAuth('login')} className="btn-choco w-full py-2 text-xs">
              Sign In
            </button>
            <button onClick={() => onOpenAuth('register')} className="btn-outline w-full py-2 text-xs">
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
