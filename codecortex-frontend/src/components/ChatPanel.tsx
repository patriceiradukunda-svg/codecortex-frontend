import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Brain, Cpu, Camera, Settings2,
  PanelLeftOpen, PanelLeftClose, Copy, Check,
  ChevronDown, Cpu as CpuIcon, Eye, Zap, Activity,
} from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { DEVICES, CAMERAS } from '@/types'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatDistanceToNow } from 'date-fns'
import ProfilingPanel from './ProfilingPanel'

interface ChatPanelProps {
  onOpenAuth: (mode: 'login' | 'register') => void
  onOpenSettings: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
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

// Suggestion prompts with icons — fix #6
const SUGGESTIONS = [
  { icon: <CpuIcon size={14} className="text-[#9B5A1A]" />, text: 'Initialize DCMI camera on STM32H7' },
  { icon: <Eye size={14} className="text-blue-400" />,       text: 'Run TFLite object detection on ESP32-CAM' },
  { icon: <Camera size={14} className="text-green-400" />,   text: 'Capture and process frames on Raspberry Pi' },
  { icon: <Zap size={14} className="text-purple-400" />,     text: 'Sobel edge detection for embedded CV' },
]

const MAX_CHARS = 2000

// Copy button with check feedback — fix #12
function CopyButton({ text }: { text: string }) {
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
      title="Copy message"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

export default function ChatPanel({
  onOpenAuth,
  onOpenSettings,
  sidebarOpen,
  onToggleSidebar,
}: ChatPanelProps) {
  const { activeChat, generating, sendMessage } = useChat()
  const { user } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [device, setDevice] = useState('STM32H7')
  const [camera, setCamera] = useState('OV2640')
  const [showScrollBtn, setShowScrollBtn] = useState(false)  // fix #14
  const [mobileTab, setMobileTab] = useState<'chat' | 'profiler'>('chat')  // fix #15
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fix #14 — show scroll-to-bottom button when not at bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distFromBottom > 120)
  }, [])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeChat?.messages])

  const handleSend = async () => {
    if (!prompt.trim() || generating) return
    if (!user) return onOpenAuth('login')
    const p = prompt
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = '44px'
    await sendMessage(p, device, camera)
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
  const charsWarning = charsLeft < 200

  return (
    <div className="flex-1 flex flex-col bg-[#161616] min-w-0 h-full overflow-hidden">

      {/* ── Header — fix #10 tighter, cleaner ── */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0e0e0e] border-b border-[#2c2c2c] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors"
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>

          {/* fix #7 — glow pulse on the brain icon */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#7B3F00]/30 animate-pulse-slow blur-sm" />
            <div className="relative w-7 h-7 rounded-full bg-[#7B3F00]/20 border border-[#7B3F00]/40
                            flex items-center justify-center">
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
          {/* fix #15 — mobile profiler tab toggle */}
          <button
            onClick={() => setMobileTab(t => t === 'chat' ? 'profiler' : 'chat')}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors"
            title="Toggle profiler"
          >
            <Activity size={16} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* ── Mobile tab bar — fix #15 ── */}
      <div className="lg:hidden flex border-b border-[#2c2c2c] shrink-0 bg-[#0e0e0e]">
        {(['chat', 'profiler'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors
              ${mobileTab === tab
                ? 'text-[#9B5A1A] border-b-2 border-[#9B5A1A]'
                : 'text-gray-600 hover:text-gray-400'
              }`}
          >
            {tab === 'chat' ? '💬 Chat' : '📊 Profiler'}
          </button>
        ))}
      </div>

      {/* ── Body: chat or profiler on mobile ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden
          ${mobileTab === 'profiler' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 flex flex-col gap-3 min-h-0"
          >
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-2 py-6">
                {/* fix #7 — polished welcome with glow */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#7B3F00]/20 blur-xl animate-pulse-slow scale-150" />
                  <div className="relative w-18 h-18 w-[72px] h-[72px] rounded-full
                                  bg-gradient-to-br from-[#7B3F00]/30 to-[#9B5A1A]/10
                                  border border-[#7B3F00]/30 flex items-center justify-center">
                    <Brain size={32} className="text-[#9B5A1A]" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">CodeCortex Pro</h2>
                  <p className="text-gray-600 text-xs sm:text-sm max-w-sm leading-relaxed">
                    AI-powered embedded C/C++ code generation for computer vision.
                    Pick a device, camera, and describe what you need.
                  </p>
                </div>
                {/* fix #6 — suggestion cards with icons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.text}
                      onClick={() => setPrompt(s.text)}
                      className="flex items-start gap-2.5 text-left bg-[#1a1a1a] hover:bg-[#222]
                                 border border-[#2c2c2c] hover:border-[#7B3F00]/40
                                 px-3 py-3 rounded-xl transition-all group"
                    >
                      <span className="shrink-0 mt-0.5">{s.icon}</span>
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 leading-snug">
                        {s.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold
                  ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#9B5A1A] to-[#7B3F00] text-white'
                    : 'bg-[#1e1e1e] border border-[#3a3a3a] text-[#9B5A1A]'
                  }`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>

                <div className={`flex flex-col gap-1.5 min-w-0 max-w-[84%]
                  ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                  {/* fix #8 — stronger contrast between user/AI bubbles */}
                  <div className={`relative px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#9B5A1A] to-[#7B3F00] text-white rounded-tr-sm shadow-lg shadow-[#7B3F00]/20'
                      : 'bg-[#202020] border border-[#2e2e2e] text-gray-200 rounded-tl-sm'
                    }`}>
                    {msg.content}

                    {/* fix #12 — copy button on hover */}
                    <div className={`absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity
                      ${msg.role === 'user' ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'}`}>
                      <CopyButton text={msg.content} />
                    </div>
                  </div>

                  {msg.code && (
                    <div className="w-full rounded-xl overflow-hidden border border-[#2c2c2c]/60">
                      <div className="flex items-center justify-between bg-black/70 px-3 py-1.5 text-[10px] text-gray-500">
                        <span className="font-mono text-[#9B5A1A]">Generated Firmware</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.code!)}
                          className="hover:text-white transition-colors flex items-center gap-1"
                        >
                          <Copy size={11} /> Copy
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language="c"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.68rem', maxHeight: '260px' }}
                      >
                        {msg.code}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {msg.metrics && (
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { label: 'Flash',  value: `${msg.metrics.flash}KB`,      color: 'text-[#9B5A1A]' },
                        { label: 'RAM',    value: `${msg.metrics.ram}KB`,        color: 'text-amber-400' },
                        { label: 'Speed',  value: `${msg.metrics.latency}ms`,    color: 'text-blue-400' },
                        { label: 'Energy', value: `${msg.metrics.energy}mJ`,     color: 'text-green-400' },
                      ].map(m => (
                        <span key={m.label} className="bg-[#1e1e1e] border border-[#2c2c2c] text-gray-400 text-[10px] px-2 py-0.5 rounded-full">
                          {m.label}: <span className={`font-semibold ${m.color}`}>{m.value}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-gray-700">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {generating && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#3a3a3a] flex items-center justify-center text-xs">🤖</div>
                <div className="bg-[#202020] border border-[#2e2e2e] text-gray-400 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-[#9B5A1A]" />
                  Generating firmware…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* fix #14 — scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-[130px] right-6 z-10 w-8 h-8 rounded-full
                         bg-[#7B3F00] hover:bg-[#9B5A1A] text-white shadow-lg
                         flex items-center justify-center transition-all animate-fade-in"
            >
              <ChevronDown size={16} />
            </button>
          )}

          {/* ── Input area — fix #2 safe-area padding ── */}
          <div
            className="px-3 sm:px-4 pt-3 pb-3 bg-[#111] border-t border-[#2c2c2c] shrink-0"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            {/* Device + Camera */}
            <div className="flex gap-2 mb-2.5">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-gray-600 mb-1 flex items-center gap-1">
                  <Cpu size={9} /> Target Device
                </label>
                <select
                  value={device}
                  onChange={e => setDevice(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl px-3 py-1.5
                             text-xs text-white outline-none focus:border-[#7B3F00]/60
                             transition-colors appearance-none cursor-pointer"
                >
                  {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-gray-600 mb-1 flex items-center gap-1">
                  <Camera size={9} /> Camera Module
                </label>
                <select
                  value={camera}
                  onChange={e => setCamera(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2c2c2c] rounded-xl px-3 py-1.5
                             text-xs text-white outline-none focus:border-[#7B3F00]/60
                             transition-colors appearance-none cursor-pointer"
                >
                  {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Textarea row */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the embedded CV code you need…"
                  className="w-full bg-[#1a1a1a] border border-[#2c2c2c] focus:border-[#7B3F00]/60
                             rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600
                             outline-none resize-none leading-relaxed transition-colors"
                  style={{ height: '44px', minHeight: '44px', maxHeight: '160px' }}
                />
                {/* fix #13 — character counter */}
                {prompt.length > 0 && (
                  <span className={`absolute bottom-2 right-3 text-[10px] transition-colors
                    ${charsWarning ? 'text-amber-500' : 'text-gray-700'}`}>
                    {charsLeft}
                  </span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!prompt.trim() || generating}
                className="bg-[#7B3F00] hover:bg-[#9B5A1A] disabled:opacity-40 disabled:cursor-not-allowed
                           text-white px-4 h-[44px] rounded-2xl flex items-center gap-2 text-sm
                           shrink-0 transition-all active:scale-95 shadow-lg shadow-[#7B3F00]/20"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>

            <p className="text-[10px] text-gray-700 mt-1.5 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* fix #15 — profiler visible on mobile via tab */}
        <div className={`h-full overflow-hidden
          ${mobileTab === 'profiler' ? 'flex lg:hidden w-full' : 'hidden'}
          lg:hidden`}>
          <ProfilingPanel />
        </div>

      </div>
    </div>
  )
}
