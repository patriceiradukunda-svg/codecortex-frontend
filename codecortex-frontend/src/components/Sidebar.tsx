import { useEffect, useState, useRef } from 'react'
import {
  Brain, Plus, MessageSquare, Trash2, Settings,
  Shield, LogOut, User as UserIcon, X, Search,
  Pencil, Check, X as XIcon, AlertTriangle,
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

// Fix #10: Inline confirmation dialog instead of native confirm()
function DeleteConfirmPopover({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="absolute right-0 top-7 z-50 w-48 rounded-xl shadow-xl p-3 animate-fade-in"
      style={{ background: '#fff', border: '1px solid #fee2e2' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <AlertTriangle size={12} className="text-red-500 shrink-0" />
        <p className="text-xs font-semibold text-gray-700">Delete chat?</p>
      </div>
      <p className="text-[10px] text-gray-400 mb-2.5 leading-snug">
        This cannot be undone.
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={onCancel}
          className="flex-1 py-1 text-[10px] font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-1 text-[10px] font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ onOpenAuth, onOpenSettings, onClose }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth()
  const { chats, activeChat, loadChats, newChat, selectChat, deleteChat } = useChat()
  const navigate = useNavigate()
  const [search, setSearch]             = useState('')
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editTitle, setEditTitle]       = useState('')
  // Fix #10: track which chat is pending delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user) loadChats() }, [user])
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  // Close confirmation when clicking elsewhere
  useEffect(() => {
    if (!confirmDeleteId) return
    const handler = () => setConfirmDeleteId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [confirmDeleteId])

  const startEdit = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteId(null)
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

  const handleDeleteConfirmed = async (id: string) => {
    setConfirmDeleteId(null)
    await deleteChat(id)
    toast.success('Chat deleted')
  }

  // Fix #7: search always visible when user is logged in, not conditionally by count
  const filtered = chats.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="w-[272px] h-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
        borderRight: '1px solid #e8e8e8',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid #eeeeee' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-md"
              style={{ background: 'rgba(192,106,26,0.2)' }}
            />
            <div
              className="relative w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
                boxShadow: '0 2px 8px rgba(192,106,26,0.35)',
              }}
            >
              <Brain size={15} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: '#C06A1A' }}>
              CodeCortex Pro
            </h1>
            <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
              AI · Embedded Vision · Profiling
            </p>
          </div>
        </div>
        {onClose && (
          // Fix #2: use Tailwind hover classes instead of inline onMouseEnter/Leave
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── New Chat button ── */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={user ? newChat : () => onOpenAuth('login')}
          className="w-full py-2.5 flex items-center justify-center gap-2
                     text-sm font-semibold text-white rounded-xl transition-all duration-200
                     hover:-translate-y-px active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
            boxShadow: '0 2px 12px rgba(192,106,26,0.30)',
          }}
        >
          <Plus size={15} /> New Chat
        </button>
      </div>

      {/* Fix #7: search always visible when logged in */}
      {user && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search
              size={11}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none
                         border border-gray-200 focus:border-[#E07820] bg-white
                         placeholder-gray-400 transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── Chat list ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {!user && (
          <p className="text-xs text-center py-6 text-gray-400">
            Sign in to see your chats
          </p>
        )}
        {filtered.length === 0 && search && (
          <p className="text-xs text-center py-6 text-gray-400">
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
              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                          border-l-2 transition-all duration-150 group relative
                          ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
              style={{ borderColor: isActive ? '#E07820' : 'transparent' }}
            >
              <MessageSquare
                size={12}
                className="mt-0.5 shrink-0"
                style={{ color: isActive ? '#E07820' : '#9CA3AF' }}
              />

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
                        background: '#fff',
                        border: '1px solid #E07820',
                        color: '#374151',
                      }}
                    />
                    <button
                      onClick={() => confirmEdit(chat.id)}
                      className="p-0.5 shrink-0 text-green-600 hover:text-green-700 transition-colors"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-0.5 shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XIcon size={11} />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-xs font-medium leading-snug line-clamp-2"
                    style={{ color: isActive ? '#92400e' : '#6B7280' }}
                  >
                    {chat.title}
                    {isEmpty && (
                      <span
                        className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full align-middle"
                        style={{ color: '#C06A1A', background: 'rgba(192,106,26,0.10)' }}
                      >
                        empty
                      </span>
                    )}
                  </p>
                )}
                {/* Fix #9: show "just now" instead of empty for fresh timestamps */}
                <p className="text-[10px] mt-0.5 text-gray-400">
                  {formatTime(chat.updatedAt) || 'just now'}
                </p>
              </div>

              {!isEditing && (
                // Fix #2: Tailwind hover classes on action buttons
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={e => startEdit(chat.id, chat.title, e)}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                  {/* Fix #10: show popover instead of instant delete */}
                  <div className="relative">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setConfirmDeleteId(confirmDeleteId === chat.id ? null : chat.id)
                      }}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                    {confirmDeleteId === chat.id && (
                      <DeleteConfirmPopover
                        onConfirm={() => handleDeleteConfirmed(chat.id)}
                        onCancel={() => setConfirmDeleteId(null)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── User area ── */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid #eeeeee' }}>
        {user ? (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: '#fff', border: '1px solid #e5e7eb' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center
                            text-white text-xs font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
                  boxShadow: '0 2px 6px rgba(192,106,26,0.30)',
                }}
              >
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-gray-900">
                  {user.name || user.email}
                </p>
                <p className="text-[10px] capitalize text-gray-400">{user.role}</p>
              </div>
            </div>

            {/* Fix #2: all hover states use Tailwind classes */}
            <div className="flex gap-1.5">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex-1 py-1.5 text-xs flex items-center justify-center
                             gap-1 rounded-xl font-medium border border-gray-200
                             text-gray-500 bg-gray-50 hover:border-[#C06A1A]
                             hover:text-[#C06A1A] hover:bg-orange-50 transition-all"
                >
                  <Shield size={11} /> Admin
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className="flex-1 py-1.5 text-xs flex items-center justify-center
                           gap-1 rounded-xl font-medium border border-gray-200
                           text-gray-500 bg-gray-50 hover:border-[#C06A1A]
                           hover:text-[#C06A1A] hover:bg-orange-50 transition-all"
              >
                <Settings size={11} /> Settings
              </button>
              {/* Fix #1: "Out" → "Sign Out" */}
              <button
                onClick={logout}
                className="flex-1 py-1.5 text-xs flex items-center justify-center
                           gap-1 rounded-xl font-medium border border-red-200
                           text-red-400 bg-red-50 hover:border-red-500
                           hover:text-red-600 hover:bg-red-100 transition-all"
              >
                <LogOut size={11} /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: '#fff', border: '1px solid #e5e7eb' }}
          >
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <UserIcon size={13} /> Guest Mode
            </div>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full py-2 text-xs font-semibold text-white rounded-xl
                         hover:opacity-90 active:scale-[0.98] transition-all"
              style={{
                background: 'linear-gradient(135deg, #E07820 0%, #C06A1A 100%)',
                boxShadow: '0 2px 8px rgba(192,106,26,0.25)',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full py-2 text-xs font-medium rounded-xl border border-gray-200
                         text-gray-500 bg-gray-50 hover:border-[#C06A1A]
                         hover:text-[#C06A1A] hover:bg-orange-50 transition-all"
            >
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
