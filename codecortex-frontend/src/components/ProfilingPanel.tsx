import { useState, useRef, useEffect } from 'react'
import {
  Activity, Download, FileCode, FileJson, MemoryStick,
  Zap, Clock, GitBranch, ClipboardPaste, Loader2, BarChart3, X,
} from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { DEVICES } from '@/types'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  unit: string
  color?: string
  bg?: string
  border?: string
  active: boolean
}

function MetricCard({
  icon, label, value, unit,
  color  = '#E07820',
  bg     = '#fff7ed',
  border = '#fed7aa',
  active,
}: MetricCardProps) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col items-center text-center gap-1 transition-all"
      style={{
        background: active ? bg     : '#f9fafb',
        border:     `1px solid ${active ? border : '#e5e7eb'}`,
        boxShadow:  active ? `0 2px 8px ${color}18` : 'none',
      }}
    >
      <div style={{ color: active ? color : '#d1d5db' }}>{icon}</div>
      <div className="text-xl font-bold font-mono" style={{ color: active ? color : '#d1d5db' }}>
        {value}
      </div>
      <div className="text-[10px] text-gray-400">{unit}</div>
      <div className="text-[10px] leading-tight text-gray-500">{label}</div>
    </div>
  )
}

function detectCodeLang(code: string | undefined): { ext: string; label: string } {
  if (!code) return { ext: 'c', label: '.c file' }
  if (code.includes('def ') || code.startsWith('import ') || code.startsWith('#!'))
    return { ext: 'py', label: '.py file' }
  if (code.includes('::') || code.includes('std::') || code.includes('cout') || code.includes('iostream'))
    return { ext: 'cpp', label: '.cpp file' }
  return { ext: 'c', label: '.c file' }
}

// Fix #5: proper paste modal instead of native prompt()
function PasteModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (code: string, device: string) => void
}) {
  const [code, setCode]     = useState('')
  const [device, setDevice] = useState('STM32H7')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-slide-up"
        style={{ background: '#fff', border: '1px solid #e5e7eb' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Paste Code to Profile</h3>
            <p className="text-xs text-gray-400 mt-0.5">Paste your C, C++, or Python firmware code below</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Target Device</label>
          <select
            value={device}
            onChange={e => setDevice(e.target.value)}
            className="w-full text-xs rounded-lg border border-gray-200 px-3 py-2
                       focus:outline-none focus:border-[#E07820] text-gray-700 bg-white transition-colors"
          >
            {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="#include <stdint.h>&#10;&#10;// Paste your firmware code here…"
          className="w-full h-48 font-mono text-xs rounded-xl border border-gray-200
                     focus:outline-none focus:border-[#E07820] px-3 py-2.5
                     text-gray-800 resize-none leading-relaxed bg-gray-50 transition-colors"
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-gray-200
                       text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!code.trim()) return toast.error('Please paste some code first')
              onSubmit(code.trim(), device)
            }}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-white
                       hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #E07820, #C06A1A)' }}
          >
            Profile Code
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilingPanel() {
  const { activeChat, profileCode, generating } = useChat()
  const [profiling, setProfiling]     = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)

  const m        = activeChat?.lastMetrics
  const code     = activeChat?.lastCode
  const codeLang = detectCodeLang(code)

  // Fix #5: replaced native prompt() with proper modal
  const handlePasteSubmit = async (pastedCode: string, device: string) => {
    setShowPasteModal(false)
    setProfiling(true)
    const result = await profileCode(pastedCode, device)
    setProfiling(false)
    if (result) toast.success('Code profiled successfully')
  }

  // Fix #4: replaced alert() with toast
  const downloadCode = () => {
    if (!code) return toast.error('Generate code first — send a prompt in chat')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })),
      download: `firmware_${activeChat?.lastMcu || 'mcu'}.${codeLang.ext}`,
    })
    a.click()
    toast.success(`Downloaded ${codeLang.label}`)
  }

  // Fix #4: replaced alert() with toast
  const downloadPDF = () => {
    if (!m) return toast.error('No profiling data yet — generate some code first')
    const doc = new jsPDF()
    doc.setFontSize(16); doc.text('CodeCortex Pro — Profiling Report', 20, 20)
    doc.setFontSize(10)
    doc.text(`Session : ${activeChat?.title || 'Untitled'}`, 20, 34)
    doc.text(`MCU     : ${activeChat?.lastMcu || 'N/A'}`, 20, 41)
    doc.text(`Camera  : ${activeChat?.lastCamera || 'N/A'}`, 20, 48)
    doc.text(`Date    : ${new Date().toLocaleString()}`, 20, 55)
    doc.line(20, 60, 190, 60)
    doc.setFontSize(12); doc.text('Resource Profile', 20, 69)
    doc.setFontSize(10)
    ;[
      `Flash : ${m.flash} KB`,
      `RAM   : ${m.ram} KB`,
      `Speed : ${m.latency} ms/frame`,
      `Energy: ${m.energy} mJ`,
      `Complexity: ${m.complexity} — ${m.complexityDesc ?? ''}`,
    ].forEach((line, i) => doc.text(line, 25, 79 + i * 8))
    if (code) {
      doc.line(20, 122, 190, 122)
      doc.setFontSize(12); doc.text('Generated Code (preview)', 20, 131)
      doc.setFontSize(7)
      doc.text(doc.splitTextToSize(code.slice(0, 1500), 170), 20, 139)
    }
    doc.save(`profile_${activeChat?.id || 'report'}.pdf`)
    toast.success('PDF downloaded')
  }

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify({
      session: activeChat?.title, mcu: activeChat?.lastMcu,
      camera: activeChat?.lastCamera, metrics: m, messages: activeChat?.messages,
    }, null, 2)], { type: 'application/json' })
    Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `chat_${activeChat?.id || 'session'}.json`,
    }).click()
    toast.success('JSON downloaded')
  }

  return (
    <>
      {/* Fix #5: proper paste modal */}
      {showPasteModal && (
        <PasteModal
          onClose={() => setShowPasteModal(false)}
          onSubmit={handlePasteSubmit}
        />
      )}

      <div
        className="w-full lg:w-[288px] flex flex-col h-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
          borderLeft: '1px solid #e8e8e8',
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-4 py-3 flex items-center gap-2 shrink-0"
          style={{
            background:   '#ffffff',
            borderBottom: '1px solid #eeeeee',
            boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
              border:     '1px solid #fdba74',
            }}
          >
            <Activity size={14} style={{ color: '#E07820' }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Resource Profiler</h3>
            <p className="text-[10px] truncate">
              {generating ? (
                <span className="flex items-center gap-1 text-[#E07820]">
                  <Loader2 size={9} className="animate-spin" /> Generating…
                </span>
              ) : m
                ? <span className="text-green-600">✅ {activeChat?.lastMcu} · {activeChat?.lastCamera}</span>
                : <span className="text-gray-400">Send a message to profile</span>
              }
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Empty state ── */}
          {!m && (
            <div className="flex flex-col items-center justify-center text-center px-5 py-12 gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}
              >
                <BarChart3 size={22} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">No profiling data yet</p>
                <p className="text-xs mt-1 leading-relaxed text-gray-400">
                  Generate code in the chat to see Flash, RAM, speed and energy metrics here.
                </p>
              </div>
              {/* Fix #5: open proper modal, not native prompt() */}
              <button
                onClick={() => setShowPasteModal(true)}
                disabled={profiling}
                className="text-xs px-4 py-2 rounded-xl transition-all disabled:opacity-50
                           flex items-center gap-1.5 font-medium border border-orange-200
                           text-[#C06A1A] bg-orange-50 hover:bg-orange-100
                           hover:border-[#C06A1A] active:scale-[0.97]"
              >
                {profiling ? <Loader2 size={12} className="animate-spin" /> : <ClipboardPaste size={12} />}
                Paste code to evaluate
              </button>
            </div>
          )}

          {/* ── Metric cards ── */}
          {m && (
            <>
              <div className="grid grid-cols-2 gap-2 p-3">
                <MetricCard icon={<FileCode size={14} />} label="Code Size (Flash)"  value={m.flash}   unit="KB"       color="#E07820" bg="#fff7ed" border="#fed7aa" active={!!m} />
                <MetricCard icon={<MemoryStick size={14} />} label="Memory (RAM)"    value={m.ram}     unit="KB"       color="#d97706" bg="#fffbeb" border="#fde68a" active={!!m} />
                <MetricCard icon={<Clock size={14} />} label="Processing Speed"      value={m.latency} unit="ms/frame" color="#2563eb" bg="#eff6ff" border="#bfdbfe" active={!!m} />
                <MetricCard icon={<Zap size={14} />} label="Energy per Frame"        value={m.energy}  unit="mJ"       color="#16a34a" bg="#f0fdf4" border="#bbf7d0" active={!!m} />
              </div>

              <div
                className="mx-3 mb-3 rounded-xl p-3"
                style={{
                  background: '#fff',
                  border:     '1px solid #e5e7eb',
                  boxShadow:  '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <GitBranch size={12} style={{ color: '#7c3aed' }} />
                  <span className="text-xs font-semibold text-gray-700">Time Complexity</span>
                </div>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold"
                  style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}
                >
                  {m.complexity}
                </span>
                <p className="text-[11px] mt-2 leading-relaxed text-gray-500">{m.complexityDesc}</p>
                {m.notes && (
                  <p
                    className="text-[11px] mt-1.5 pt-1.5 leading-relaxed text-gray-400"
                    style={{ borderTop: '1px solid #f3f4f6' }}
                  >
                    {m.notes}
                  </p>
                )}
              </div>

              {code && (
                <div className="mx-3 mb-3">
                  <p className="text-[10px] mb-1.5 flex items-center gap-1 text-gray-400">
                    <FileCode size={10} /> Generated Code Preview
                  </p>
                  <div
                    className="rounded-xl p-3 font-mono text-[11px] overflow-x-auto
                                max-h-[140px] whitespace-pre leading-relaxed"
                    style={{ background: '#1e1e1e', border: '1px solid #374151', color: '#d1d5db' }}
                  >
                    {code.slice(0, 500)}{code.length > 500 ? '\n…' : ''}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Action buttons ── Fix #2/#4: Tailwind hover classes, toast on error ── */}
        <div
          className="p-3 space-y-2 shrink-0"
          style={{ borderTop: '1px solid #eeeeee', background: '#fff' }}
        >
          <button
            onClick={() => setShowPasteModal(true)}
            disabled={profiling}
            className="w-full text-xs py-2.5 rounded-xl flex items-center justify-center
                       gap-2 transition-all disabled:opacity-50 font-medium
                       border border-gray-200 text-gray-600 bg-gray-50
                       hover:bg-orange-50 hover:border-[#C06A1A] hover:text-[#C06A1A]"
          >
            {profiling ? <Loader2 size={12} className="animate-spin" /> : <ClipboardPaste size={12} />}
            Paste & Evaluate Code
          </button>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={downloadCode}
              className="text-[11px] py-2.5 rounded-xl flex flex-col items-center gap-1
                         transition-all font-medium border border-gray-200 text-gray-500
                         bg-gray-50 hover:bg-orange-50 hover:border-[#C06A1A] hover:text-[#C06A1A]"
            >
              <Download size={12} />
              {codeLang.label}
            </button>
            <button
              onClick={downloadPDF}
              className="text-[11px] py-2.5 rounded-xl flex flex-col items-center gap-1
                         transition-all font-medium border border-gray-200 text-gray-500
                         bg-gray-50 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
            >
              <Download size={12} />
              PDF
            </button>
            <button
              onClick={downloadJSON}
              className="text-[11px] py-2.5 rounded-xl flex flex-col items-center gap-1
                         transition-all font-medium border border-gray-200 text-gray-500
                         bg-gray-50 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
            >
              <FileJson size={12} />
              JSON
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
