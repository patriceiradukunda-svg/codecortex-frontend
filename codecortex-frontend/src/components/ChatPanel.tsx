import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Brain, Cpu, Camera, Settings2,
  PanelLeftOpen, PanelLeftClose, Copy, Check,
  ChevronDown, Eye, Zap, Activity, CheckCircle2,
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

type Language = 'C' | 'C++' | 'Python'
type OutputStyle = 'clean' | 'commented' | 'guide'

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
  } catch { return '' }
}

function parseAIContent(raw: string): { clean: string; isGenerated: boolean } {
  const withoutProfile = raw
    .replace(/📊\s*\*\*Resource Profile:\*\*[^\n]*/g, '')
    .replace(/Resource Profile:[^\n]*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\w]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const isGenerated = raw.includes('✅') || raw.includes('Generated firmware')
  return { clean: withoutProfile, isGenerated }
}

function MessageText({ text }: { text: string }) {
  const paragraphs = text.split('\n\n').filter(Boolean)
  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n')
        return (
          <p key={i} className="leading-relaxed text-sm">
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

const SUGGESTIONS = [
  { icon: <Cpu size={14} className="text-[#9B5A1A]" />,   text: 'Initialize DCMI camera on STM32H7' },
  { icon: <Eye size={14} className="text-blue-400" />,     text: 'Run TFLite object detection on ESP32-CAM' },
  { icon: <Camera size={14} className="text-green-400" />, text: 'Capture and process frames on Raspberry Pi' },
  { icon: <Zap size={14} className="text-purple-400" />,   text: 'Sobel edge detection for embedded CV' },
]

const MAX_CHARS = 2000

function CopyButton({ text, size = 13 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-all"
      title="Copy"
    >
      {copied
        ? <Check size={size} className="text-green-400" />
        : <Copy size={size} />
      }
    </button>
  )
}

function getLangLabel(lang: Language): { file: string; syntax: string; label: string } {
  switch (lang) {
    case 'C++':    return { file: 'firmware.cpp', syntax: 'cpp',    label: 'C++' }
    case 'Python': return { file: 'firmware.py',  syntax: 'python', label: 'Python' }
    default:       return { file: 'firmware.c',   syntax: 'c',      label: 'C' }
  }
}

export default function ChatPanel({
  onOpenAuth, onOpenSettings, sidebarOpen, onToggleSidebar,
}: ChatPanelProps) {
  const { activeChat, generating, sendMessage } = useChat()
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

  // Step 1 — show language picker
  const handleSend = async () => {
    if (!prompt.trim() || generating) return
    if (!user) return onOpenAuth('login')
    setPendingPrompt(prompt)
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = '44px'
    setShowLangPicker(true)
  }

  // Step 2 — language chosen, show style picker
  const handleLanguageSelect = (lang: Language) => {
    setShowLangPicker(false)
    setSelectedLang(lang)
    setLastLang(lang)
    setShowStylePicker(true)
  }

  // Step 3 — style chosen, send
  const handleStyleSelect = async (style: OutputStyle) => {
    setShowStylePicker(false)
    await sendMessage(pendingPrompt, device, camera, selectedLang, style)
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
  const langMeta  = getLangLabel(lastLang)

  return (
    <div className="flex-1 flex flex-col bg-[#161616] min-w-0 h-full overflow-hidden">

      {/* ── Modals ── */}
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
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0e0e0e] border-b border-[#2c2c2c] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onToggleSidebar}
            className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors">
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#7B3F00]/30 animate-pulse-slow blur-sm" />
            <div className="relative w-7 h-7 rounded-full bg-[#7B3F00]/20 border border-[#7B3F00]/40 flex items-center justify-center">
              <Brain size={14} className="text-[#9B5A1A]" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate leading-tight">
              {activeChat?.title || 'CodeCortex Pro'}
            </p>
            <p className="text-[10px] text-gray-600 hidden sm:block">AI Embedded Vision Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setMobileTab(t => t === 'chat' ? 'profiler' : 'chat')}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors">
            <Activity size={16} />
          </button>
          <button onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors">
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="lg:hidden flex border-b border-[#2c2c2c] shrink-0 bg-[#0e0e0e]">
        {(['chat', 'profiler'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors
              ${mobileTab === tab
                ? 'text-[#9B5A1A] border-b-2 border-[#9B5A1A]'
                : 'text-gray-600 hover:text-gray-400'
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
          <div ref={scrollRef} onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 flex flex-col gap-4 min-h-0">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-2 py-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#7B3F00]/20 blur-2xl animate-pulse-slow scale-150" />
                  <div className="relative w-[72px] h-[72px] rounded-full
                                  bg-gradient-to-br from-[#7B3F00]/30 to-[#9B5A1A]/10
                                  border border-[#7B3F00]/30 flex items-center justify-center">
                    <Brain size={32} className="text-[#9B5A1A]" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">CodeCortex Pro</h2>
                  <p className="text-gray-600 text-xs sm:text-sm max-w-sm leading-relaxed">
                    AI-powered embedded C / C++ / Python code generation for computer vision.
                    Pick a device, camera, and describe what you need.
                  </p>
                </div>
                {/* ── Suggestion grid — 1 col on tiny, 2 col on xs+ ── */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map(s => (
                    <button key={s.text} onClick={() => setPrompt(s.text)}
                      className="flex items-start gap-2.5 text-left bg-[#1a1a1a] hover:bg-[#222]
                                 border border-[#2c2c2c] hover:border-[#7B3F00]/40
                                 px-3 py-3 rounded-xl transition-all group">
                      <span className="shrink-0 mt-0.5">{s.icon}</span>
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 leading-snug">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map(msg => {
              const isUser = msg.role === 'user'
              const { clean, isGenerated } = isUser
                ? { clean: msg.content, isGenerated: false }
                : parseAIContent(msg.content)

              return (
                <div key={msg.id}
                  className={`flex gap-2 sm:gap-3 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold self-start mt-0.5
                    ${isUser
                      ? 'bg-gradient-to-br from-[#9B5A1A] to-[#7B3F00] text-white'
                      : 'bg-[#1e1e1e] border border-[#3a3a3a]'
                    }`}>
                    {isUser ? '👤' : '🤖'}
                  </div>

                  <div className={`flex flex-col gap-2 min-w-0 max-w-[84%] ${isUser ? 'items-end' : 'items-start'}`}>

                    {/* User bubble */}
                    {isUser && (
                      <div className="relative group/bubble">
                        <div className="bg-gradient-to-br from-[#9B5A1A] to-[#7B3F00] text-white
                                        px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-lg shadow-[#7B3F00]/20 text-sm leading-relaxed">
                          {msg.content}
                        </div>
                        <div className="absolute top-1 -left-8 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                          <CopyButton text={msg.content} />
                        </div>
                      </div>
                    )}

                    {/* AI bubble */}
                    {!isUser && (
                      <div className="w-full space-y-2">

                        {isGenerated && (
                          <div className="flex items-center gap-1.5 text-xs text-green-400">
                            <CheckCircle2 size={13} />
                            <span className="font-medium">Firmware generated successfully</span>
                          </div>
                        )}

                        <div className="relative group/bubble bg-[#1e1e1e] border border-[#2e2e2e]
                                        rounded-2xl rounded-tl-sm px-4 py-3 text-gray-200">
                          <MessageText text={clean} />
                          <div className="absolute top-2 -right-8 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                            <CopyButton text={clean} />
                          </div>
                        </div>

                        {/* Metrics pills */}
                        {msg.metrics && (
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Flash',      value: `${msg.metrics.flash} KB`,     color: 'text-[#9B5A1A]',  bg: 'bg-[#7B3F00]/10 border-[#7B3F00]/20' },
                              { label: 'RAM',        value: `${msg.metrics.ram} KB`,       color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20' },
                              { label: 'Speed',      value: `${msg.metrics.latency} ms/f`, color: 'text-blue-400',   bg: 'bg-blue-400/10  border-blue-400/20' },
                              { label: 'Energy',     value: `${msg.metrics.energy} mJ`,    color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20' },
                              { label: 'Complexity', value: msg.metrics.complexity,        color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
                            ].map(m => (
                              <div key={m.label}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] ${m.bg}`}>
                                <span className="text-gray-500">{m.label}</span>
                                <span className={`font-semibold font-mono ${m.color}`}>{m.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Code block */}
                        {msg.code && (
                          <div className="w-full rounded-xl overflow-hidden border border-[#2c2c2c]/60 bg-[#0d0d0d]">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-b border-[#2c2c2c]">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                </div>
                                <span className="text-[10px] text-[#9B5A1A] font-mono font-medium">
                                  {langMeta.file}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-700 font-mono">{langMeta.label}</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(msg.code!)}
                                  className="flex items-center gap-1 text-[10px] text-gray-500
                                             hover:text-white transition-colors px-2 py-0.5
                                             rounded-md hover:bg-white/5"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                            </div>
                            <SyntaxHighlighter
                              language={langMeta.syntax}
                              style={vscDarkPlus}
                              showLineNumbers
                              customStyle={{
                                margin: 0,
                                borderRadius: 0,
                                fontSize: '0.7rem',
                                maxHeight: '320px',
                                background: '#0d0d0d',
                                padding: '1rem',
                              }}
                              lineNumberStyle={{ color: '#444', fontSize: '0.65rem', minWidth: '2.5rem' }}
                            >
                              {msg.code}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-gray-700 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              )
            })}

            {/* Generating indicator */}
            {generating && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#3a3a3a] flex items-center justify-center text-xs shrink-0">🤖</div>
                <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9B5A1A] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9B5A1A] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9B5A1A] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-gray-500 text-sm">Generating firmware…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Scroll to bottom */}
          {showScrollBtn && (
            <button onClick={scrollToBottom}
              className="absolute bottom-[140px] right-5 z-10 w-8 h-8 rounded-full
                         bg-[#7B3F00] hover:bg-[#9B5A1A] text-white shadow-lg
                         flex items-center justify-center transition-all">
              <ChevronDown size={16} />
            </button>
          )}

          {/* ── Input area ── */}
          <div
            className="px-3 sm:px-4 pt-3 bg-[#111] border-t border-[#2c2c2c] shrink-0"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            {/* Device + Camera — wrap on tiny screens, side by side on xs+ */}
            <div className="flex flex-wrap xs:flex-nowrap gap-2 mb-2.5">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] text-gray-600 mb-1 flex items-center gap-1">
                  <Cpu size={9} /> Target Device
                </label>
                <select value={device} onChange={e => setDevice(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl px-3 py-1.5
                             text-xs text-white outline-none focus:border-[#7B3F00]/60 transition-colors">
                  {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] text-gray-600 mb-1 flex items-center gap-1">
                  <Camera size={9} /> Camera Module
                </label>
                <select value={camera} onChange={e => setCamera(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl px-3 py-1.5
                             text-xs text-white outline-none focus:border-[#7B3F00]/60 transition-colors">
                  {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Textarea + send */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the embedded CV code you need…"
                  className="w-full bg-[#1a1a1a] border border-[#2c2c2c] focus:border-[#7B3F00]/60
                             rounded-2xl px-4 py-2.5 pr-14 text-sm text-white placeholder:text-gray-600
                             outline-none resize-none leading-relaxed transition-colors"
                  style={{ height: '44px', minHeight: '44px', maxHeight: '160px' }}
                />
                {prompt.length > 0 && (
                  <span className={`absolute bottom-2.5 right-3 text-[10px] transition-colors pointer-events-none
                    ${charsWarn ? 'text-amber-500' : 'text-gray-700'}`}>
                    {charsLeft}
                  </span>
                )}
              </div>
              <button onClick={handleSend}
                disabled={!prompt.trim() || generating}
                className="bg-[#7B3F00] hover:bg-[#9B5A1A] disabled:opacity-40 disabled:cursor-not-allowed
                           text-white px-4 h-[44px] rounded-2xl flex items-center justify-center
                           shrink-0 transition-all active:scale-95 shadow-lg shadow-[#7B3F00]/20">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>

            <p className="text-[10px] text-gray-700 mt-2 mb-3 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Mobile profiler tab */}
        <div className={`h-full overflow-hidden w-full
          ${mobileTab === 'profiler' ? 'flex lg:hidden' : 'hidden'}`}>
          <ProfilingPanel />
        </div>

      </div>
    </div>
  )
}
