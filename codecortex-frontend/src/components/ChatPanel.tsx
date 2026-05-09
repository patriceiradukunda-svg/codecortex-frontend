import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Brain, Cpu, Camera, Settings2 } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { DEVICES, CAMERAS } from '@/types'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatDistanceToNow } from 'date-fns'

interface ChatPanelProps {
  onOpenAuth: (mode: 'login' | 'register') => void
  onOpenSettings: () => void
}

export default function ChatPanel({ onOpenAuth, onOpenSettings }: ChatPanelProps) {
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

  const messages = activeChat?.messages ?? []

  // ── Safe timestamp formatter ──────────────────────────────────────────────
  const formatTime = (timestamp: any): string => {
    try {
      // Handle MongoDB {$date: "..."} format or plain ISO string
      const ts = timestamp?.$date ?? timestamp
      if (!ts) return ''
      const date = new Date(ts)
      if (isNaN(date.getTime())) return ''
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#161616] min-w-0">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3 bg-[#0e0e0e] border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-choco/20 border border-choco/30 flex items-center justify-center">
            <Brain size={16} className="text-choco-light" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white">
              {activeChat?.title || 'CodeCortex Pro'}
            </p>
            <p className="text-[10px] text-gray-500">AI Embedded Vision Assistant</p>
          </div>
        </div>
        <button onClick={onOpenSettings} className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-card">
          <Settings2 size={17} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-choco/10 border border-choco/20 flex items-center justify-center">
              <Brain size={36} className="text-choco-light" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">CodeCortex Pro</h2>
              <p className="text-gray-500 text-sm max-w-md leading-relaxed">
                AI-powered embedded C/C++ code generation for computer vision tasks.
                Select your device and camera, then describe what you need.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-md">
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
            className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold
              ${msg.role === 'user' ? 'bg-choco text-white' : 'bg-card border border-border text-choco-light'}`}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>

            <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
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

      {/* Input area */}
      <div className="px-4 py-3 bg-[#121212] border-t border-border shrink-0">
        {/* Device/Camera selectors */}
        <div className="flex gap-2 mb-2.5">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
              <Cpu size={10} /> Target Device
            </label>
            <select
              value={device}
              onChange={e => setDevice(e.target.value)}
              className="input-dark text-xs py-1.5"
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
              className="input-dark text-xs py-1.5"
            >
              {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Text input + send */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the embedded CV code you need…"
            className="input-dark flex-1 resize-none py-2.5 leading-relaxed"
            style={{ height: '44px', minHeight: '44px', maxHeight: '180px' }}
          />
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || generating}
            className="btn-choco px-5 h-[44px] flex items-center gap-2 text-sm shrink-0"
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
