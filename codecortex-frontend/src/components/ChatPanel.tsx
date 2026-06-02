import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Brain, Cpu, Camera, Settings2,
  PanelLeftOpen, PanelLeftClose, Copy, Check,
  ChevronDown, Activity, CheckCircle2,
  Pencil, RotateCcw, Trash2, LogIn,
} from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { DEVICES, CAMERAS } from '@/types'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatDistanceToNow } from 'date-fns'
import ProfilingPanel from './ProfilingPanel'
import LanguagePicker from './LanguagePicker'
import OutputStylePicker from './OutputStylePicker'

interface ChatPanelProps {
  onOpenAuth: (mode: 'login' | 'register') => void
  onOpenSettings: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

type Language    = 'C' | 'C++' | 'Python'
type OutputStyle = 'clean' | 'commented' | 'guide'

// Fix #9: return "just now" instead of '' for very fresh timestamps
function formatTime(timestamp: any): string {
  try {
    if (!timestamp) return 'just now'
    if (typeof timestamp === 'object' && timestamp !== null) {
      const val = timestamp.$date ?? timestamp.date ?? Object.values(timestamp)[0]
      if (!val) return 'just now'
      const d = new Date(String(val))
      if (isNaN(d.getTime())) return 'just now'
      const ageMs = Date.now() - d.getTime()
      return ageMs < 5000 ? 'just now' : formatDistanceToNow(d, { addSuffix: true })
    }
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return 'just now'
    const ageMs = Date.now() - d.getTime()
    return ageMs < 5000 ? 'just now' : formatDistanceToNow(d, { addSuffix: true })
  } catch { return 'just now' }
}

function parseAIContent(raw: string): { clean: string; isGenerated: boolean } {
  const clean = raw
    .replace(/📊\s*\*\*Resource Profile:\*\*[^\n]*/g, '')
    .replace(/Resource Profile:[^\n]*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\w]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return {
    clean,
    isGenerated: raw.includes('✅') || raw.includes('Generated firmware') || raw.includes('Generated'),
  }
}

function detectLang(code: string): { syntax: string; filename: string } {
  if (code.includes('def ') || code.startsWith('import ') || code.startsWith('#!'))
    return { syntax: 'python', filename: 'firmware.py' }
  if (code.includes('::') || code.includes('std::') || code.includes('cout'))
    return { syntax: 'cpp', filename: 'firmware.cpp' }
  return { syntax: 'c', filename: 'firmware.c' }
}

function getLangMeta(lang: Language): { file: string; syntax: string; label: string } {
  switch (lang) {
    case 'C++':    return { file: 'firmware.cpp', syntax: 'cpp',    label: 'C++' }
    case 'Python': return { file: 'firmware.py',  syntax: 'python', label: 'Python' }
    default:       return { file: 'firmware.c',   syntax: 'c',      label: 'C' }
  }
}

function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split('\n\n').filter(Boolean).map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
          ))}
        </p>
      ))}
    </div>
  )
}

// Fix #6: CopyButton shows confirmation tick + "Copied!" text
function CopyButton({ text, size = 13, showLabel = false }: { text: string; size?: number; showLabel?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for browsers blocking clipboard
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 p-1.5 rounded-lg transition-all
        ${copied
          ? 'text-green-600 bg-green-50'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
        }`}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
      {showLabel && (
        <span className="text-[10px] font-medium">
          {copied ? 'Copied!' : 'Copy'}
        </span>
      )}
    </button>
  )
}

const SUGGESTIONS = [
  { icon: <Cpu    size={14} className="text-[#E07820]" />,  text: 'Initialize DCMI camera on STM32H7' },
  { icon: <Activity size={14} className="text-blue-500" />, text: 'Run TFLite object detection on ESP32-CAM' },
  { icon: <Camera size={14} className="text-green-500" />,  text: 'Capture and process frames on Raspberry Pi' },
  { icon: <Brain  size={14} className="text-purple-500" />, text: 'Sobel edge detection for embedded CV' },
]

const MAX_CHARS = 2000

export default function ChatPanel({
  onOpenAuth, onOpenSettings, sidebarOpen, onToggleSidebar,
}: ChatPanelProps) {
  const {
    activeChat, generating,
    sendMessage, deleteMessage, editMessage, resendMessage,
    setActiveChat,
  } = useChat()
  const { user } = useAuth()

  const [prompt, setPrompt]                   = useState('')
  const [device, setDevice]                   = useState('STM32H7')
  const [camera, setCamera]                   = useState('OV2640')
  const [showScrollBtn, setShowScrollBtn]     = useState(false)
  const [mobileTab, setMobileTab]             = useState<'chat' | 'profiler'>('chat')

  const [showLangPicker, setShowLangPicker]   = useState(false)
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [pendingPrompt, setPendingPrompt]     = useState('')
  const [selectedLang, setSelectedLang]       = useState<Language>('C')
  const [lastLang, setLastLang]               = useState<Language>('C')

  const [editingMsgId, setEditingMsgId]       = useState<string | null>(null)
  const [editContent, setEditContent]         = useState('')

  const bottomRef   = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
  }, [])

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [activeChat?.messages])

  // Fix #8: Escape closes pickers
  useEffect(() => {
    if (!showLangPicker && !showStylePicker) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showLangPicker) handleLanguageCancel()
      if (showStylePicker) handleStyleCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showLangPicker, showStylePicker])

  // ── Send flow ─────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!prompt.trim() || generating) return
    if (!user) return onOpenAuth('login')
    setPendingPrompt(prompt)
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = '44px'
    setShowLangPicker(true)
  }

  const handleLanguageSelect = (lang: Language) => {
    setShowLangPicker(false)
    setSelectedLang(lang)
    setLastLang(lang)
    setShowStylePicker(true)
  }

  const handleStyleSelect = async (style: OutputStyle) => {
    setShowStylePicker(false)
    await sendMessage(
      pendingPrompt, device, camera, selectedLang, style,
      activeChat?.id ?? null,
    )
    setPendingPrompt('')
  }

  const handleLanguageCancel = () => {
    setShowLangPicker(false)
    setPrompt(pendingPrompt)
    setPendingPrompt('')
  }

  const handleStyleCancel = () => {
    setShowStylePicker(false)
    setPrompt(pendingPrompt)
    setPendingPrompt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length > MAX_CHARS) return
    setPrompt(e.target.value)
    e.target.style.height = '44px'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  // ── Edit / Delete / Resend handlers ──────────────────────────────────────

  const handleStartEdit = (msgId: string, content: string) => {
    setEditingMsgId(msgId)
    setEditContent(content)
  }

  const handleConfirmEdit = async (msgId: string) => {
    if (!activeChat || !editContent.trim()) return
    setEditingMsgId(null)
    await editMessage(activeChat.id, msgId, editContent.trim())
    await resendMessage(editContent.trim(), device, camera, lastLang, 'clean')
  }

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChat) return
    await deleteMessage(activeChat.id, msgId)
  }

  const handleResend = async (content: string, msgIndex: number) => {
    if (!activeChat || generating) return
    setActiveChat((prev: any) => prev ? {
      ...prev,
      messages: prev.messages.slice(0, msgIndex + 1),
    } : prev)
    await resendMessage(content, device, camera, lastLang, 'clean')
  }

  // ── Normalize messages ────────────────────────────────────────────────────

  const messages = (activeChat?.messages ?? []).map(msg => ({
    ...msg,
    timestamp: (() => {
      try {
        if (!msg.timestamp) return null
        if (typeof msg.timestamp === 'object' && (msg.timestamp as any).$date)
          return (msg.timestamp as any).$date
        return msg.timestamp
      } catch { return null }
    })()
  }))

  const charsLeft = MAX_CHARS - prompt.length
  const charsWarn = charsLeft < 200
  const langMeta  = getLangMeta(lastLang)

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 h-full overflow-hidden">

      {/* ── Modal overlays ── */}
      {showLangPicker && (
        <LanguagePicker
          onSelect={handleLanguageSelect}
          onCancel={handleLanguageCancel}
        />
      )}
      {showStylePicker && (
        <OutputStylePicker
          onSelect={handleStyleSelect}
          onCancel={handleStyleCancel}
        />
      )}

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-3 py-2.5
                         bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Fix #2: Tailwind hover class instead of onMouseEnter/Leave */}
          <button
            onClick={onToggleSidebar}
            className="shrink-0 p-1.5 rounded-lg text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>

          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#C06A1A]/20 blur-md animate-pulse-slow" />
            <div className="relative w-7 h-7 rounded-full bg-[#C06A1A]/10 border border-[#C06A1A]/30
                            flex items-center justify-center">
              <Brain size={14} className="text-[#E07820]" />
            </div>
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-800 truncate leading-tight">
              {activeChat?.title || 'CodeCortex Pro'}
            </p>
            <p className="text-[10px] text-gray-400 hidden sm:block">
              AI Embedded Vision Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMobileTab(t => t === 'chat' ? 'profiler' : 'chat')}
            className="lg:hidden p-1.5 rounded-lg text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Activity size={16} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-gray-400
                       hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </header>

      {/* ── Mobile tab bar ── */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white shrink-0">
        {(['chat', 'profiler'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${mobileTab === tab
                ? 'text-[#E07820] border-b-2 border-[#E07820]'
                : 'text-gray-400 hover:text-gray-600'
              }`}>
            {tab === 'chat' ? '💬 Chat' : '📊 Profiler'}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Chat column */}
        <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden
          ${mobileTab === 'profiler' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 sm:px-5 py-5
                       flex flex-col gap-4 min-h-0 bg-gray-50"
          >

            {/* Empty / welcome state */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center
                              gap-6 px-4 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#C06A1A]/10
                                  blur-3xl scale-150 animate-pulse-slow" />
                  <div className="relative w-20 h-20 rounded-full
                                  bg-gradient-to-br from-[#C06A1A]/15 to-[#E07820]/5
                                  border border-[#C06A1A]/20
                                  flex items-center justify-center">
                    <Brain size={36} className="text-[#E07820]" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    CodeCortex Pro
                  </h2>
                  <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                    AI-powered embedded C/C++ code generation for computer
                    vision tasks. Select your device and camera, then describe
                    what you need.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.text}
                      onClick={() => {
                        // Fix #3: if not logged in, prompt login instead of silently filling
                        if (!user) return onOpenAuth('login')
                        setPrompt(s.text)
                      }}
                      className="flex items-start gap-2.5 text-left px-3 py-3 rounded-xl
                                 border border-gray-200 bg-white
                                 hover:border-[#E07820]/40 hover:bg-orange-50
                                 transition-all group"
                    >
                      <span className="shrink-0 mt-0.5">{s.icon}</span>
                      <div className="min-w-0">
                        <span className="text-xs text-gray-500
                                         group-hover:text-gray-700 leading-snug block">
                          {s.text}
                        </span>
                        {/* Fix #3: show sign-in hint for guests */}
                        {!user && (
                          <span className="text-[10px] text-[#E07820] flex items-center gap-0.5 mt-0.5">
                            <LogIn size={9} /> Sign in to use
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Message bubbles ── */}
            {messages.map((msg, msgIndex) => {
              const isUser = msg.role === 'user'
              const { clean, isGenerated } = isUser
                ? { clean: msg.content, isGenerated: false }
                : parseAIContent(msg.content)
              const { syntax, filename } = msg.code
                ? detectLang(msg.code)
                : { syntax: langMeta.syntax, filename: langMeta.file }

              const isEditingThis = editingMsgId === msg.id

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 sm:gap-3 group animate-slide-up
                    ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center
                                 justify-center text-xs font-bold self-start mt-0.5
                      ${isUser
                        ? 'bg-gradient-to-br from-[#E07820] to-[#C06A1A] text-white shadow-md shadow-[#C06A1A]/20'
                        : 'bg-white border border-gray-200 shadow-sm'
                      }`}
                  >
                    {isUser ? '👤' : '🤖'}
                  </div>

                  <div
                    className={`flex flex-col gap-1.5 min-w-0
                                 max-w-[86%] sm:max-w-[80%]
                      ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {/* ── User bubble ── */}
                    {isUser && (
                      <div className="w-full">
                        {isEditingThis ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              autoFocus
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleConfirmEdit(msg.id)
                                }
                                if (e.key === 'Escape') setEditingMsgId(null)
                              }}
                              className="w-full text-sm rounded-xl px-3.5 py-2.5
                                         focus:outline-none resize-none leading-relaxed"
                              style={{
                                border:     '1px solid #E07820',
                                color:      '#374151',
                                background: '#fff',
                                minHeight:  '80px',
                                boxShadow:  '0 0 0 3px rgba(224,120,32,0.12)',
                              }}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingMsgId(null)}
                                className="px-3 py-1.5 text-xs rounded-lg font-medium
                                           border border-gray-200 text-gray-500 bg-gray-50
                                           hover:bg-gray-100 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmEdit(msg.id)}
                                className="px-3 py-1.5 text-xs rounded-lg font-medium
                                           text-white hover:opacity-90 transition-opacity"
                                style={{ background: 'linear-gradient(135deg, #E07820, #C06A1A)' }}
                              >
                                Save & Resend
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group/bubble flex flex-col items-end gap-1">
                            <div
                              className="bg-gradient-to-br from-[#E07820] to-[#C06A1A]
                                          text-white rounded-2xl rounded-tr-sm
                                          px-4 py-2.5 text-sm leading-relaxed
                                          shadow-md shadow-[#C06A1A]/15"
                            >
                              {msg.content}
                            </div>

                            {/* Fix #2: Tailwind-based hover instead of onMouseEnter/Leave */}
                            <div className="flex gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEdit(msg.id, msg.content)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg
                                           text-[10px] font-medium border border-gray-200
                                           text-gray-500 bg-gray-50 hover:bg-gray-100
                                           transition-colors"
                                title="Edit and resend"
                              >
                                <Pencil size={9} /> Edit
                              </button>
                              <button
                                onClick={() => handleResend(msg.content, msgIndex)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg
                                           text-[10px] font-medium border border-blue-200
                                           text-blue-500 bg-blue-50 hover:bg-blue-100
                                           transition-colors"
                                title="Resend this message"
                              >
                                <RotateCcw size={9} /> Resend
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg
                                           text-[10px] font-medium border border-red-200
                                           text-red-500 bg-red-50 hover:bg-red-100
                                           transition-colors"
                                title="Delete message"
                              >
                                <Trash2 size={9} /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── AI bubble ── */}
                    {!isUser && (
                      <div className="w-full space-y-2.5">
                        {isGenerated && (
                          <div className="flex items-center gap-1.5 text-[11px] text-green-600 font-medium">
                            <CheckCircle2 size={12} /> Firmware generated successfully
                          </div>
                        )}

                        <div className="relative group/bubble bg-white border border-gray-200
                                        rounded-2xl rounded-tl-sm px-4 py-3
                                        shadow-sm text-gray-700">
                          <MessageText text={clean} />
                          <div className="absolute top-2 right-2 flex gap-1
                                          opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                            {/* Fix #6: CopyButton with visible label and green tick */}
                            <CopyButton text={clean} size={12} showLabel />
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-lg text-gray-400
                                         hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Delete message"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Metric pills */}
                        {msg.metrics && (
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Flash',      value: `${msg.metrics.flash} KB`,    color: '#E07820', bg: '#fff7ed', border: '#fed7aa' },
                              { label: 'RAM',        value: `${msg.metrics.ram} KB`,       color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                              { label: 'Speed',      value: `${msg.metrics.latency} ms/f`, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                              { label: 'Energy',     value: `${msg.metrics.energy} mJ`,    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                              { label: 'Complexity', value: msg.metrics.complexity,         color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                            ].map(m => (
                              <div
                                key={m.label}
                                className="flex items-center gap-1.5 px-2.5 py-1
                                           rounded-full text-[10px] font-medium"
                                style={{ background: m.bg, border: `1px solid ${m.border}` }}
                              >
                                <span className="text-gray-400">{m.label}</span>
                                <span className="font-mono font-semibold" style={{ color: m.color }}>
                                  {m.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Code block */}
                        {msg.code && (
                          <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-[#1e1e1e]">
                            <div className="flex items-center justify-between px-4 py-2
                                            bg-[#2d2d2d] border-b border-gray-700">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                                </div>
                                <span className="text-[10px] text-[#E07820] font-mono">{filename}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-mono uppercase">{syntax}</span>
                                {/* Fix #6: code copy button also shows tick */}
                                <CopyButton text={msg.code} size={10} showLabel />
                              </div>
                            </div>
                            <SyntaxHighlighter
                              language={syntax}
                              style={vscDarkPlus}
                              showLineNumbers
                              customStyle={{
                                margin: 0, borderRadius: 0, fontSize: '0.7rem',
                                maxHeight: '320px', background: '#1e1e1e',
                                padding: '1rem',
                              }}
                              lineNumberStyle={{ color: '#4a4a4a', fontSize: '0.65rem', minWidth: '2.5rem' }}
                            >
                              {msg.code}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fix #9: always show a timestamp, never empty */}
                    <span className="text-[10px] text-gray-400 px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Generating dots */}
            {generating && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-7 h-7 rounded-full bg-white border border-gray-200
                                shadow-sm flex items-center justify-center text-xs shrink-0">🤖</div>
                <div className="bg-white border border-gray-200 rounded-2xl
                                rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <div
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-[#E07820] animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">
                    Generating {lastLang} firmware…
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Scroll to bottom */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-[160px] right-4 z-10 w-8 h-8 rounded-full
                         bg-[#E07820] hover:bg-[#C06A1A] text-white
                         shadow-lg shadow-[#C06A1A]/20
                         flex items-center justify-center transition-all animate-fade-in"
            >
              <ChevronDown size={16} />
            </button>
          )}

          {/* ── Input area ── */}
          <div
            className="bg-white border-t border-gray-200 shrink-0 px-3 sm:px-4 pt-3"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            {/* Device + Camera */}
            <div className="flex gap-2 mb-2.5">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                  <Cpu size={9} /> Target Device
                </label>
                <select
                  value={device}
                  onChange={e => setDevice(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 bg-white
                             text-gray-700 px-2.5 py-1.5 focus:outline-none
                             focus:border-[#E07820] focus:ring-1
                             focus:ring-[#E07820]/30 transition-all"
                >
                  {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                  <Camera size={9} /> Camera Module
                </label>
                <select
                  value={camera}
                  onChange={e => setCamera(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 bg-white
                             text-gray-700 px-2.5 py-1.5 focus:outline-none
                             focus:border-[#E07820] focus:ring-1
                             focus:ring-[#E07820]/30 transition-all"
                >
                  {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Last used lang hint */}
            {lastLang && (
              <p className="text-[10px] text-gray-400 mb-2">
                Last used: <span className="text-[#C06A1A]">{langMeta.label}</span>
                {' · '}
                <span className="text-gray-400">Language and style selected on send ↗</span>
              </p>
            )}

            {/* Textarea + Send */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative min-w-0">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the embedded CV code you need…"
                  className="w-full text-sm rounded-xl border border-gray-200 bg-white
                             text-gray-800 placeholder-gray-400 px-3.5 py-2.5 pr-14
                             focus:outline-none focus:border-[#E07820] focus:ring-2
                             focus:ring-[#E07820]/20 transition-all resize-none
                             leading-relaxed"
                  style={{ height: '44px', minHeight: '44px', maxHeight: '160px' }}
                />
                {prompt.length > 0 && (
                  <span
                    className={`absolute bottom-2.5 right-3 text-[10px]
                                  pointer-events-none transition-colors
                      ${charsWarn ? 'text-amber-500' : 'text-gray-400'}`}
                  >
                    {charsLeft}
                  </span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!prompt.trim() || generating}
                className="bg-[#E07820] hover:bg-[#C06A1A] disabled:opacity-40
                           text-white rounded-xl px-4 h-[44px] flex items-center
                           justify-center shrink-0 transition-all shadow-sm
                           shadow-[#C06A1A]/20 active:scale-95"
              >
                {generating
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={15} />
                }
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-2 mb-3">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Mobile profiler tab */}
        <div className={`w-full h-full overflow-hidden
          ${mobileTab === 'profiler' ? 'flex lg:hidden' : 'hidden'}`}>
          <ProfilingPanel />
        </div>
      </div>
    </div>
  )
}
