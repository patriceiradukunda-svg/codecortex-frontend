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
    <div className="w-[272px] h-full flex flex-col"
      style={{ background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
               borderRight: '1px solid #e8e8e8' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid #eeeeee' }}>
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-md"
              style={{ background: 'rgba(192,106,26,0.2)' }} />
            <div className="relative w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
                       boxShadow: '0 2px 8px rgba(192,106,26,0.35)' }}>
              <Brain size={15} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold"
              style={{ color: '#C06A1A' }}>
              CodeCortex Pro
            </h1>
            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
              AI · Embedded Vision · Profiling
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => {
              (e.target as HTMLElement).closest('button')!.style.background = '#f0f0f0'
              ;(e.target as HTMLElement).closest('button')!.style.color = '#374151'
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).closest('button')!.style.background = 'transparent'
              ;(e.target as HTMLElement).closest('button')!.style.color = '#9CA3AF'
            }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── New Chat button ── */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={user ? newChat : () => onOpenAuth('login')}
          className="w-full py-2.5 flex items-center justify-center gap-2
                     text-sm font-semibold text-white rounded-xl transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
            boxShadow: '0 2px 12px rgba(192,106,26,0.30)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(192,106,26,0.45)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(192,106,26,0.30)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          }}
        >
          <Plus size={15} /> New Chat
        </button>
      </div>

      {/* ── Search ── */}
      {user && chats.length > 2 && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9CA3AF' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none transition-all"
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#374151',
              }}
              onFocus={e => (e.target.style.borderColor = '#E07820')}
              onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
        </div>
      )}

      {/* ── Chat list ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 min-h-0">
        {!user && (
          <p className="text-xs text-center py-8 px-3 leading-relaxed"
            style={{ color: '#9CA3AF' }}>
            Sign in to save and access your chat history
          </p>
        )}
        {filtered.length === 0 && search && (
          <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>
            No results for "{search}"
          </p>
        )}

        {filtered.map(chat => {
          const isEmpty   = (chat.messages?.length ?? 0) === 0
          const isActive  = activeChat?.id === chat.id
          const isEditing = editingId === chat.id

          return (
            <div
              key={chat.id}
              onClick={() => !isEditing && handleSelect(chat.id)}
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                         border-l-2 transition-all duration-150 group"
              style={{
                background:   isActive ? '#fff7ed' : 'transparent',
                borderColor:  isActive ? '#E07820' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.background = '#f9fafb'
              }}
              onMouseLeave={e => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <MessageSquare size={12}
                className="mt-0.5 shrink-0"
                style={{ color: isActive ? '#E07820' : '#9CA3AF' }} />

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
                      className="flex-1 min-w-0 rounded px-2 py-0.5 text-xs outline-none"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #E07820',
                        color: '#374151',
                      }}
                    />
                    <button onClick={() => confirmEdit(chat.id)}
                      className="p-0.5 shrink-0 transition-colors"
                      style={{ color: '#16a34a' }}>
                      <Check size={11} />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="p-0.5 shrink-0 transition-colors"
                      style={{ color: '#9CA3AF' }}>
                      <XIcon size={11} />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-medium leading-snug line-clamp-2"
                    style={{ color: isActive ? '#92400e' : '#6B7280' }}>
                    {chat.title}
                    {isEmpty && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full align-middle"
                        style={{ color: '#C06A1A', background: 'rgba(192,106,26,0.10)' }}>
                        empty
                      </span>
                    )}
                  </p>
                )}
                <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
                  {formatTime(chat.updatedAt)}
                </p>
              </div>

              {!isEditing && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100
                                transition-opacity shrink-0">
                  <button onClick={e => startEdit(chat.id, chat.title, e)}
                    className="p-1 rounded transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}>
                    <Pencil size={11} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteChat(chat.id) }}
                    className="p-1 rounded transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}>
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── User area ── */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid #eeeeee' }}>
        {user ? (
          <div className="rounded-xl p-3 space-y-2.5"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center
                              text-white text-xs font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
                  boxShadow: '0 2px 6px rgba(192,106,26,0.30)',
                }}>
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: '#111827' }}>
                  {user.name || user.email}
                </p>
                <p className="text-[10px] capitalize" style={{ color: '#9CA3AF' }}>
                  {user.role}
                </p>
              </div>
            </div>

            <div className="flex gap-1.5">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex-1 py-1.5 text-xs flex items-center justify-center
                             gap-1 rounded-xl font-medium transition-all"
                  style={{
                    border: '1px solid #e5e7eb',
                    color: '#6B7280',
                    background: '#f9fafb',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#C06A1A'
                    ;(e.currentTarget as HTMLElement).style.color = '#C06A1A'
                    ;(e.currentTarget as HTMLElement).style.background = '#fff7ed'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'
                    ;(e.currentTarget as HTMLElement).style.color = '#6B7280'
                    ;(e.currentTarget as HTMLElement).style.background = '#f9fafb'
                  }}>
                  <Shield size={11} /> Admin
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className="flex-1 py-1.5 text-xs flex items-center justify-center
                           gap-1 rounded-xl font-medium transition-all"
                style={{
                  border: '1px solid #e5e7eb',
                  color: '#6B7280',
                  background: '#f9fafb',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#C06A1A'
                  ;(e.currentTarget as HTMLElement).style.color = '#C06A1A'
                  ;(e.currentTarget as HTMLElement).style.background = '#fff7ed'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'
                  ;(e.currentTarget as HTMLElement).style.color = '#6B7280'
                  ;(e.currentTarget as HTMLElement).style.background = '#f9fafb'
                }}>
                <Settings size={11} /> Settings
              </button>
              <button
                onClick={logout}
                className="flex-1 py-1.5 text-xs flex items-center justify-center
                           gap-1 rounded-xl font-medium transition-all"
                style={{
                  border: '1px solid #fecaca',
                  color: '#f87171',
                  background: '#fff5f5',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'
                  ;(e.currentTarget as HTMLElement).style.color = '#dc2626'
                  ;(e.currentTarget as HTMLElement).style.background = '#fee2e2'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#fecaca'
                  ;(e.currentTarget as HTMLElement).style.color = '#f87171'
                  ;(e.currentTarget as HTMLElement).style.background = '#fff5f5'
                }}>
                <LogOut size={11} /> Out
              </button>
            </div>
          </div>

        ) : (
          <div className="rounded-xl p-3 space-y-2"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
              <UserIcon size={13} /> Guest Mode
            </div>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full py-2 text-xs font-semibold text-white rounded-xl transition-all"
              style={{
                background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
                boxShadow: '0 2px 8px rgba(192,106,26,0.25)',
              }}>
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-2 text-xs font-medium rounded-xl transition-all"
              style={{
                border: '1px solid #e5e7eb',
                color: '#6B7280',
                background: '#f9fafb',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#C06A1A'
                ;(e.currentTarget as HTMLElement).style.color = '#C06A1A'
                ;(e.currentTarget as HTMLElement).style.background = '#fff7ed'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'
                ;(e.currentTarget as HTMLElement).style.color = '#6B7280'
                ;(e.currentTarget as HTMLElement).style.background = '#f9fafb'
              }}>
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
