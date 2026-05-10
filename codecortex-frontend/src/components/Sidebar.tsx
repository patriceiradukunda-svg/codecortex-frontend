import { useEffect, useState, useRef } from 'react'
import {
  Brain, Plus, MessageSquare, Trash2, Settings,
  Shield, LogOut, User as UserIcon, X, Search,
  Pencil, Check, X as XIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useChat } from '@/contexts/ChatContext'
import { chatsApi } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface SidebarProps {
  onOpenAuth: (mode: 'login' | 'register') => void
  onOpenSettings: () => void
  onClose?: () => void
}

function formatTime(ts: any): string {
  try {
    if (!ts) return ''
    if (typeof ts === 'object') {
      const v = ts.$date ?? ts.date ?? Object.values(ts)[0]
      if (!v) return ''
      const d = new Date(String(v))
      return isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true })
    }
    const d = new Date(ts)
    return isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true })
  } catch { return '' }
}

export default function Sidebar({ onOpenAuth, onOpenSettings, onClose }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth()
  const { chats, activeChat, loadChats, newChat, selectChat, deleteChat } = useChat()
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user) loadChats() }, [user])
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  const startEdit = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(id)
    setEditTitle(title)
  }

  const confirmEdit = async (id: string) => {
    const t = editTitle.trim()
    if (t) {
      try {
        await chatsApi.rename(id, t)
        await loadChats()
        toast.success('Renamed')
      } catch { toast.error('Failed to rename') }
    }
    setEditingId(null)
  }

  const handleSelect = (id: string) => {
    selectChat(id)
    onClose?.()
  }

  const filtered = chats.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-[272px] h-full bg-[#0f0f0f] border-r border-[#2a2a2a] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a2a] shrink-0">
        <div>
          <h1 className="text-sm font-bold text-[#E07820] flex items-center gap-2">
            <Brain size={17} /> CodeCortex Pro
          </h1>
          <p className="text-[10px] text-[#6B7280] mt-0.5">AI · Embedded Vision · Profiling</p>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1e1e1e] transition-colors">
            <X size={15} />
          </button>
        )}
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={user ? newChat : () => onOpenAuth('login')}
          className="btn-brand w-full py-2.5 flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={15} /> New Chat
        </button>
      </div>

      {/* Search */}
      {user && chats.length > 2 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg
                         pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#4B5563]
                         outline-none focus:border-[#C06A1A]/50 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 min-h-0">
        {!user && (
          <p className="text-xs text-[#6B7280] text-center py-8 px-3 leading-relaxed">
            Sign in to save and access your chat history
          </p>
        )}
        {filtered.length === 0 && search && (
          <p className="text-xs text-[#6B7280] text-center py-6">No results for "{search}"</p>
        )}

        {filtered.map(chat => {
          const isEmpty  = (chat.messages?.length ?? 0) === 0
          const isActive = activeChat?.id === chat.id
          const isEditing = editingId === chat.id

          return (
            <div
              key={chat.id}
              onClick={() => !isEditing && handleSelect(chat.id)}
              className={`sidebar-item group
                ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
            >
              <MessageSquare size={12}
                className={`mt-0.5 shrink-0 ${isActive ? 'text-[#E07820]' : 'text-[#6B7280]'}`} />

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      ref={editRef}
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmEdit(chat.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 min-w-0 bg-[#2a2a2a] border border-[#C06A1A]/40
                                 rounded px-2 py-0.5 text-xs text-white outline-none"
                    />
                    <button onClick={() => confirmEdit(chat.id)}
                      className="p-0.5 text-green-400 hover:text-green-300 shrink-0">
                      <Check size={11} />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="p-0.5 text-[#6B7280] hover:text-gray-300 shrink-0">
                      <XIcon size={11} />
                    </button>
                  </div>
                ) : (
                  <p className={`text-xs font-medium leading-snug line-clamp-2
                    ${isActive ? 'text-white' : 'text-[#9CA3AF] group-hover:text-gray-200'}`}>
                    {chat.title}
                    {isEmpty && (
                      <span className="ml-1.5 text-[9px] text-[#C06A1A] bg-[#C06A1A]/10
                                       px-1.5 py-0.5 rounded-full align-middle">
                        empty
                      </span>
                    )}
                  </p>
                )}
                <p className="text-[10px] text-[#4B5563] mt-0.5">{formatTime(chat.updatedAt)}</p>
              </div>

              {!isEditing && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={e => startEdit(chat.id, chat.title, e)}
                    className="p-1 rounded text-[#6B7280] hover:text-gray-300 transition-colors">
                    <Pencil size={11} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                    className="p-1 rounded text-[#6B7280] hover:text-red-400 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* User area */}
      <div className="p-3 border-t border-[#2a2a2a] shrink-0">
        {user ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#C06A1A] flex items-center justify-center
                              text-white text-xs font-bold shrink-0">
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name || user.email}</p>
                <p className="text-[10px] text-[#6B7280] capitalize">{user.role}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="btn-ghost flex-1 py-1.5 text-xs flex items-center justify-center gap-1">
                  <Shield size={11} /> Admin
                </button>
              )}
              <button onClick={onOpenSettings} className="btn-ghost flex-1 py-1.5 text-xs flex items-center justify-center gap-1">
                <Settings size={11} /> Settings
              </button>
              <button onClick={logout}
                className="flex-1 border border-[#2a2a2a] hover:border-red-900/60 hover:bg-red-950/20
                           text-[#6B7280] hover:text-red-400 rounded-xl py-1.5 text-xs
                           flex items-center justify-center gap-1 transition-all">
                <LogOut size={11} /> Out
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-[#6B7280] text-xs">
              <UserIcon size={13} /> Guest Mode
            </div>
            <button onClick={() => onOpenAuth('login')} className="btn-brand w-full py-2 text-xs">
              Sign In
            </button>
            <button onClick={() => onOpenAuth('register')} className="btn-ghost w-full py-2 text-xs">
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
