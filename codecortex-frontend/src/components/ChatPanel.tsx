import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Brain, Cpu, Camera, Settings2, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { DEVICES, CAMERAS } from '@/types'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatDistanceToNow } from 'date-fns'

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
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    setPrompt(e.target.value)
    e.target.style.height = '44px'
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
  }

  const messages = (activeChat?.messages ?? []).map(msg => ({
    ...msg,
    timestamp: (() => {
      try {
        if (!msg.timestamp) return null
        if (typeof msg.timestamp === 'object' && (msg.timestamp as any).$date) {
          return (msg.timestamp as any).$date
        }
        return msg.timestamp
      } catch {
        return null
      }
    })()
  }))

  return (
    <div className="flex-1 flex flex-col bg-[#161616] min-w-0 h-full overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center px-3 sm:px-5 py-3 bg-[#0e0e0e] border-b border-border shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-card shrink-0"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen
              ? <PanelLeftClose size={17} />
              : <PanelLeftOpen size={17} />
            }
          </button>

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-choco/20 border border-choco/30 flex items-center justify-center shrink-0">
            <Brain size={15} className="text-choco-light" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-white truncate">
              {activeChat?.title || 'CodeCortex Pro'}
            </p>
            <p className="text-[10px] text-gray-500 hidden sm:block">AI Embedded Vision Assistant</p>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-card shrink-0"
        >
          <Settings2 size={17} />
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-fade-in px-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-choco/10 border border-choco/20 flex items-center justify-center">
              <Brain size={28} className="sm:hidden text-choco-light" />
              <Brain size={36} className="hidden sm:block text-choco-light" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">CodeCortex Pro</h2>
              <p className="text-gray-500 text-xs sm:text-sm max-w-md leading-relaxed">
                AI-powered embedded C/C++ code generation for computer vision tasks.
                Select your device and camera, then describe what you need.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-md">
              {[
                'Initialize DCMI camera on STM32H7',
                'Run TFLite object detection on ESP32-CAM',
                'Capture and process frames on Raspberry Pi',
                'Sobel edge detection for embedded CV',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-left bg-card hover:bg-border border border-border hover:border-choco/30
                             text-xs text-gray-400 hover:text-white px-3 py-2.5 rounded-xl transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2 sm:gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold
              ${msg.role === 'user' ? 'bg-choco text-white' : 'bg-card border border-border text-choco-light'}`}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>

            <div className={`flex flex-col gap-2 max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={msg.role === 'user' ? 'message-bubble-user' : 'message-bubble-ai'}>
                {msg.content}
              </div>

              {msg.code && (
                <div className="w-full rounded-xl overflow-hidden border border-border/30">
                  <div className="flex items-center justify-between bg-black/60 px-3 py-1.5 text-[10px] text-gray-500">
                    <span className="font-mono">Generated Firmware</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.code!)}
                      className="hover:text-choco-light transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <SyntaxHighlighter
                    language="c"
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.7rem', maxHeight: '300px' }}
                  >
                    {msg.code}
                  </SyntaxHighlighter>
                </div>
              )}

              {msg.metrics && (
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Flash', value: `${msg.metrics.flash}KB` },
                    { label: 'RAM', value: `${msg.metrics.ram}KB` },
                    { label: 'Speed', value: `${msg.metrics.latency}ms` },
                    { label: 'Energy', value: `${msg.metrics.energy}mJ` },
                  ].map(m => (
                    <span key={m.label} className="bg-border text-gray-300 text-[10px] px-2 py-0.5 rounded-full">
                      {m.label}: <span className="text-choco-light font-semibold">{m.value}</span>
                    </span>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-gray-600">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {generating && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-xs">🤖</div>
            <div className="message-bubble-ai flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-choco-light" />
              <span className="text-gray-400 text-sm">Generating firmware…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 py-3 bg-[#121212] border-t border-border shrink-0">
        {/* Device + Camera selects — stack on mobile, side-by-side on sm+ */}
        <div className="flex flex-col sm:flex-row gap-2 mb-2.5">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
              <Cpu size={10} /> Target Device
            </label>
            <select
              value={device}
              onChange={e => setDevice(e.target.value)}
              className="input-dark text-xs py-1.5 w-full"
            >
              {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
              <Camera size={10} /> Camera Module
            </label>
            <select
              value={camera}
              onChange={e => setCamera(e.target.value)}
              className="input-dark text-xs py-1.5 w-full"
            >
              {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the embedded CV code you need…"
            className="input-dark flex-1 resize-none py-2.5 leading-relaxed text-sm"
            style={{ height: '44px', minHeight: '44px', maxHeight: '180px' }}
          />
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || generating}
            className="btn-choco px-4 sm:px-5 h-[44px] flex items-center gap-2 text-sm shrink-0"
          >
            {generating
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
