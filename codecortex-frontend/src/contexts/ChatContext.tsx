import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Chat, Message, ProfilingMetrics } from '@/types'
import { chatsApi, generateApi } from '@/services/api'
import toast from 'react-hot-toast'

interface ChatContextType {
  chats: Chat[]
  activeChat: Chat | null
  generating: boolean
  loadChats: () => Promise<void>
  selectChat: (id: string) => Promise<void>
  newChat: () => Promise<Chat | null>
  deleteChat: (id: string) => Promise<void>
  renameChat: (id: string, title: string) => Promise<void>
  sendMessage: (
    prompt: string,
    device: string,
    camera: string,
    language: string,
    style: string,
    chatId?: string | null,
  ) => Promise<void>
  deleteMessage: (chatId: string, messageId: string) => Promise<void>
  editMessage: (chatId: string, messageId: string, content: string) => Promise<void>
  resendMessage: (
    prompt: string,
    device: string,
    camera: string,
    language: string,
    style: string,
  ) => Promise<void>
  profileCode: (code: string, device: string) => Promise<ProfilingMetrics | null>
  setActiveChat: React.Dispatch<React.SetStateAction<Chat | null>>
}

const ChatContext = createContext<ChatContextType | null>(null)

function normalizeTimestamp(ts: any): string {
  try {
    if (!ts) return new Date().toISOString()
    if (typeof ts === 'object' && ts.$date) return String(ts.$date)
    if (typeof ts === 'object' && ts.date) return String(ts.date)
    const d = new Date(ts)
    if (isNaN(d.getTime())) return new Date().toISOString()
    return d.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function normalizeMetrics(m: any): ProfilingMetrics | undefined {
  if (!m) return undefined
  return {
    flash:          m.flash,
    ram:            m.ram,
    latency:        m.latency,
    energy:         m.energy,
    complexity:     m.complexity,
    complexityDesc: m.complexityDesc ?? m.complexity_desc ?? '',
    cpuFreq:        m.cpuFreq       ?? m.cpu_freq,
    notes:          m.notes,
  }
}

function normalizeChat(chat: any): Chat {
  return {
    id:          chat.id ?? String(chat._id ?? ''),
    userId:      chat.userId    ?? chat.user_id    ?? '',
    title:       chat.title     ?? 'New Chat',
    lastMcu:     chat.lastMcu   ?? chat.last_mcu   ?? undefined,
    lastCamera:  chat.lastCamera ?? chat.last_camera ?? undefined,
    lastCode:    chat.lastCode  ?? chat.last_code  ?? undefined,
    lastMetrics: normalizeMetrics(chat.lastMetrics ?? chat.last_metrics),
    createdAt:   normalizeTimestamp(chat.createdAt ?? chat.created_at),
    updatedAt:   normalizeTimestamp(chat.updatedAt ?? chat.updated_at),
    messages: (chat.messages ?? []).map((msg: any) => ({
      id:        msg.id      ?? String(msg._id ?? Date.now()),
      role:      msg.role,
      content:   msg.content,
      code:      msg.code    ?? undefined,
      metrics:   normalizeMetrics(msg.metrics),
      timestamp: normalizeTimestamp(msg.timestamp),
    })),
  }
}

function isEmptyChat(chat: Chat): boolean {
  return (chat.messages?.length ?? 0) === 0
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats]           = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [generating, setGenerating] = useState(false)

  const loadChats = useCallback(async () => {
    try {
      const { data } = await chatsApi.list()
      const normalized = (data.items ?? []).map(normalizeChat)
      setChats(normalized)
      if (normalized.length > 0 && !activeChat) {
        setActiveChat(normalized[0])
      }
    } catch {
      // silent — user may not be logged in
    }
  }, [activeChat])

  const selectChat = async (id: string) => {
    const { data } = await chatsApi.get(id)
    setActiveChat(normalizeChat(data))
  }

  // Issue #7 fix: newChat now RETURNS the created chat so callers can use
  // the stable ID directly, rather than reading from state (which is async
  // and may not have updated by the time the caller needs it).
  const newChat = async (): Promise<Chat | null> => {
    const existingEmpty = chats.find(isEmptyChat)
    if (existingEmpty) {
      setActiveChat(existingEmpty)
      toast('You already have an empty chat', { icon: '💬' })
      return existingEmpty
    }
    try {
      const { data } = await chatsApi.create()
      const normalized = normalizeChat(data)
      setChats(prev => [normalized, ...prev])
      setActiveChat(normalized)
      return normalized
    } catch {
      toast.error('Failed to create chat')
      return null
    }
  }

  const deleteChat = async (id: string) => {
    await chatsApi.delete(id)
    setChats(prev => prev.filter(c => c.id !== id))
    if (activeChat?.id === id) {
      setActiveChat(chats.find(c => c.id !== id) || null)
    }
  }

  const renameChat = async (id: string, title: string) => {
    const { data } = await chatsApi.rename(id, title)
    const normalized = normalizeChat(data)
    setChats(prev => prev.map(c => c.id === id ? normalized : c))
    if (activeChat?.id === id) {
      setActiveChat(prev => prev ? { ...prev, title } : prev)
    }
  }

  const sendMessage = async (
    prompt: string,
    device: string,
    camera: string,
    language: string = 'C',
    style: string = 'clean',
    chatId?: string | null,
  ) => {
    // Issue #7 fix: resolve the chat ID synchronously before touching state.
    // If no chatId is provided and there is no active chat, create one and
    // capture the returned ID directly — do NOT read from state afterwards.
    let resolvedChatId = chatId ?? activeChat?.id ?? null

    if (!resolvedChatId) {
      const created = await newChat()
      if (!created) return  // newChat failed and already showed a toast
      resolvedChatId = created.id
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    }

    setActiveChat(prev => prev
      ? { ...prev, messages: [...prev.messages, userMsg] }
      : prev
    )
    setGenerating(true)

    try {
      const { data } = await generateApi.generate({
        prompt, device, camera, language, style,
        chatId: resolvedChatId,
      })

      const aiMsg: Message = {
        id: data.messageId,
        role: 'assistant',
        content: data.explanation,
        code: data.code,
        metrics: normalizeMetrics(data.metrics),
        timestamp: new Date().toISOString(),
      }

      setActiveChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMsg],
        lastCode: data.code,
        lastMetrics: normalizeMetrics(data.metrics),
        lastMcu: device,
        lastCamera: camera,
      } : prev)

      // Update the sidebar title on first message in a brand-new chat
      setChats(prev => prev.map(c =>
        c.id === data.chatId
          ? { ...c, title: prompt.slice(0, 40) + (prompt.length > 40 ? '…' : '') }
          : c
      ))
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Generation failed')
      // Issue #6 fix: roll back the optimistically added user message
      setActiveChat(prev => prev
        ? { ...prev, messages: prev.messages.filter(m => m.id !== userMsg.id) }
        : prev
      )
    } finally {
      setGenerating(false)
    }
  }

  const deleteMessage = async (chatId: string, messageId: string) => {
    // Snapshot for rollback before optimistic update (Issue #6 fix)
    const snapshot = activeChat ? { ...activeChat, messages: [...activeChat.messages] } : null

    setActiveChat(prev => prev ? {
      ...prev,
      messages: prev.messages.filter(m => m.id !== messageId),
    } : prev)

    try {
      await chatsApi.deleteMessage(chatId, messageId)
    } catch {
      toast.error('Failed to delete message')
      // Issue #6 fix: restore the exact pre-mutation snapshot instead of
      // re-fetching (avoids the navigation-away race condition)
      if (snapshot) setActiveChat(snapshot)
    }
  }

  const editMessage = async (
    chatId: string,
    messageId: string,
    content: string,
  ) => {
    // Snapshot for rollback (Issue #6 fix)
    const snapshot = activeChat ? { ...activeChat, messages: [...activeChat.messages] } : null

    setActiveChat(prev => prev ? {
      ...prev,
      messages: prev.messages.map(m =>
        m.id === messageId ? { ...m, content } : m
      ),
    } : prev)

    try {
      await chatsApi.editMessage(chatId, messageId, content)
    } catch {
      toast.error('Failed to edit message')
      if (snapshot) setActiveChat(snapshot)
    }
  }

  const resendMessage = async (
    prompt: string,
    device: string,
    camera: string,
    language: string,
    style: string,
  ) => {
    await sendMessage(prompt, device, camera, language, style, activeChat?.id)
  }

  const profileCode = async (code: string, device: string) => {
    try {
      const { data } = await generateApi.profile({ code, device })
      setActiveChat(prev => prev
        ? { ...prev, lastMetrics: normalizeMetrics(data) }
        : prev
      )
      return normalizeMetrics(data) ?? null
    } catch {
      toast.error('Profiling failed')
      return null
    }
  }

  return (
    <ChatContext.Provider value={{
      chats,
      activeChat,
      generating,
      loadChats,
      selectChat,
      newChat,
      deleteChat,
      renameChat,
      sendMessage,
      deleteMessage,
      editMessage,
      resendMessage,
      profileCode,
      setActiveChat,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
