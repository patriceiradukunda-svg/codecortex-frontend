import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Chat, Message, ProfilingMetrics } from '@/types'
import { chatsApi, generateApi } from '@/services/api'
import toast from 'react-hot-toast'

interface ChatContextType {
  chats: Chat[]
  activeChat: Chat | null
  generating: boolean
  loadChats: () => Promise<void>
  selectChat: (id: string) => Promise<void>
  newChat: () => Promise<void>
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
  profileCode: (code: string, device: string) => Promise<ProfilingMetrics | null>
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

function normalizeChat(chat: any): Chat {
  return {
    ...chat,
    createdAt: normalizeTimestamp(chat.createdAt ?? chat.created_at),
    updatedAt: normalizeTimestamp(chat.updatedAt ?? chat.updated_at),
    messages: (chat.messages ?? []).map((msg: any) => ({
      ...msg,
      timestamp: normalizeTimestamp(msg.timestamp),
    })),
  }
}

function isEmptyChat(chat: Chat): boolean {
  return (chat.messages?.length ?? 0) === 0
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])
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

  const newChat = async () => {
    const existingEmpty = chats.find(isEmptyChat)
    if (existingEmpty) {
      setActiveChat(existingEmpty)
      toast('You already have an empty chat', { icon: '💬' })
      return
    }
    const { data } = await chatsApi.create()
    const normalized = normalizeChat(data)
    setChats(prev => [normalized, ...prev])
    setActiveChat(normalized)
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
    chatId?: string | null,           // ← new optional 6th parameter
  ) => {
    // Use explicitly passed chatId first, then fall back to activeChat
    const resolvedChatId = chatId ?? activeChat?.id

    if (!resolvedChatId && !chats.length) await newChat()

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
        prompt,
        device,
        camera,
        language,
        style,
        chatId: resolvedChatId,       // ← always send resolved chatId to backend
      })

      const aiMsg: Message = {
        id: data.messageId,
        role: 'assistant',
        content: data.explanation,
        code: data.code,
        metrics: data.metrics,
        timestamp: new Date().toISOString(),
      }

      setActiveChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMsg],
        lastCode: data.code,
        lastMetrics: data.metrics,
        lastMcu: device,
        lastCamera: camera,
      } : prev)

      // Update sidebar title on first message
      if (!resolvedChatId) {
        setChats(prev => prev.map(c =>
          c.id === data.chatId
            ? { ...c, title: prompt.slice(0, 40) + (prompt.length > 40 ? '…' : '') }
            : c
        ))
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Generation failed')
      setActiveChat(prev => prev
        ? { ...prev, messages: prev.messages.slice(0, -1) }
        : prev
      )
    } finally {
      setGenerating(false)
    }
  }

  const profileCode = async (code: string, device: string) => {
    try {
      const { data } = await generateApi.profile({ code, device })
      setActiveChat(prev => prev ? { ...prev, lastMetrics: data } : prev)
      return data
    } catch {
      toast.error('Profiling failed')
      return null
    }
  }

  return (
    <ChatContext.Provider value={{
      chats, activeChat, generating,
      loadChats, selectChat, newChat, deleteChat, renameChat,
      sendMessage, profileCode,
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
