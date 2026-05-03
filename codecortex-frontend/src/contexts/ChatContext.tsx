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
  sendMessage: (prompt: string, device: string, camera: string) => Promise<void>
  profileCode: (code: string, device: string) => Promise<ProfilingMetrics | null>
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [generating, setGenerating] = useState(false)

  const loadChats = useCallback(async () => {
    try {
      const { data } = await chatsApi.list()
      setChats(data.items)
      if (data.items.length > 0 && !activeChat) {
        setActiveChat(data.items[0])
      }
    } catch {
      // silent — user may not be logged in
    }
  }, [activeChat])

  const selectChat = async (id: string) => {
    const { data } = await chatsApi.get(id)
    setActiveChat(data)
  }

  const newChat = async () => {
    const { data } = await chatsApi.create()
    setChats(prev => [data, ...prev])
    setActiveChat(data)
  }

  const deleteChat = async (id: string) => {
    await chatsApi.delete(id)
    setChats(prev => prev.filter(c => c.id !== id))
    if (activeChat?.id === id) {
      setActiveChat(chats.find(c => c.id !== id) || null)
    }
  }

  const sendMessage = async (prompt: string, device: string, camera: string) => {
    if (!activeChat && !chats.length) await newChat()
    const chatId = activeChat?.id

    // Optimistic user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    }
    setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev)

    setGenerating(true)
    try {
      const { data } = await generateApi.generate({ prompt, device, camera, chatId })

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

      // Update sidebar title if first message
      if (!chatId) {
        setChats(prev => prev.map(c =>
          c.id === data.chatId
            ? { ...c, title: prompt.slice(0, 40) + (prompt.length > 40 ? '…' : '') }
            : c
        ))
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Generation failed')
      setActiveChat(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev)
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
      loadChats, selectChat, newChat, deleteChat, sendMessage, profileCode,
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
