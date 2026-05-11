import { useState } from 'react'
import {
  Activity, Download, FileCode, FileJson, MemoryStick,
  Zap, Clock, GitBranch, ClipboardPaste, Loader2, BarChart3,
} from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import jsPDF from 'jspdf'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  unit: string
  color?: string
  active: boolean
}

function MetricCard({ icon, label, value, unit, color = 'text-[#E07820]', active }: MetricCardProps) {
  return (
    <div className={`bg-[#1a1a1a] border rounded-xl p-3 flex flex-col items-center text-center gap-1 transition-colors
      ${active ? 'border-[#383838]' : 'border-[#2a2a2a]'}`}>
      <div className={`transition-colors ${active ? color : 'text-[#383838]'}`}>{icon}</div>
      <div className={`text-xl font-bold font-mono transition-colors ${active ? color : 'text-[#383838]'}`}>
        {value}
      </div>
      <div className="text-[10px] text-[#6B7280]">{unit}</div>
      <div className="text-[10px] text-[#4B5563] leading-tight">{label}</div>
    </div>
  )
}

/** Detect language from code content and return the correct file extension + label */
function detectCodeLang(code: string | undefined): { ext: string; label: string } {
  if (!code) return { ext: 'c', label: '.c file' }
  if (code.includes('def ') || code.startsWith('import ') || code.startsWith('#!'))
    return { ext: 'py', label: '.py file' }
  if (
    code.includes('::') ||
    code.includes('std::') ||
    code.includes('cout') ||
    code.includes('iostream')
  )
    return { ext: 'cpp', label: '.cpp file' }
  return { ext: 'c', label: '.c file' }
}

export default function ProfilingPanel() {
  const { activeChat, profileCode, generating } = useChat()
  const [profiling, setProfiling] = useState(false)

  const m    = activeChat?.lastMetrics
  const code = activeChat?.lastCode

  // ── Detect language from last generated code ──────────────────────────────
  const codeLang = detectCodeLang(code)

  const handlePaste = async () => {
    const input = prompt('Paste your C/C++ code:')
    if (!input) return
    setProfiling(true)
    await profileCode(input, activeChat?.lastMcu || 'STM32H7')
    setProfiling(false)
  }

  // ── Download code with correct extension ──────────────────────────────────
  const downloadCode = () => {
    if (!code) return alert('Generate code first')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })),
      download: `firmware_${activeChat?.lastMcu || 'mcu'}.${codeLang.ext}`,
    })
    a.click()
  }

  const downloadPDF = () => {
    if (!m) return alert('No profiling data yet')
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
  }

  return (
    <div className="w-full lg:w-[288px] bg-[#111] border-l border-[#2a2a2a] flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 bg-[#0d0d0d] border-b border-[#2a2a2a] flex items-center gap-2 shrink-0">
        <Activity size={15} className="text-[#E07820] shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">Resource Profiler</h3>
          <p className="text-[10px] text-[#6B7280] truncate">
            {generating ? (
              <span className="flex items-center gap-1 text-[#E07820]">
                <Loader2 size={9} className="animate-spin" /> Generating…
              </span>
            ) : m
              ? `✅ ${activeChat?.lastMcu} · ${activeChat?.lastCamera}`
              : 'Send a message to profile'
            }
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Empty state */}
        {!m && (
          <div className="flex flex-col items-center justify-center text-center px-5 py-12 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <BarChart3 size={22} className="text-[#383838]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#6B7280]">No profiling data yet</p>
              <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                Generate code in the chat to see Flash, RAM, speed and energy metrics here.
              </p>
            </div>
            <button onClick={handlePaste} disabled={profiling}
              className="text-xs text-[#C06A1A] border border-[#C06A1A]/30 hover:bg-[#C06A1A]/10
                         px-4 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5">
              {profiling ? <Loader2 size={12} className="animate-spin" /> : <ClipboardPaste size={12} />}
              Paste code to evaluate
            </button>
          </div>
        )}

        {/* Metric cards */}
        {m && (
          <>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MetricCard icon={<FileCode size={14} />}    label="Code Size (Flash)" value={m.flash}   unit="KB"       active={!!m} />
              <MetricCard icon={<MemoryStick size={14} />} label="Memory (RAM)"      value={m.ram}     unit="KB"       color="text-amber-400" active={!!m} />
              <MetricCard icon={<Clock size={14} />}       label="Processing Speed"  value={m.latency} unit="ms/frame" color="text-blue-400"  active={!!m} />
              <MetricCard icon={<Zap size={14} />}         label="Energy per Frame"  value={m.energy}  unit="mJ"       color="text-green-400" active={!!m} />
            </div>

            <div className="mx-3 mb-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <GitBranch size={12} className="text-purple-400" />
                <span className="text-xs font-semibold text-gray-300">Time Complexity</span>
              </div>
              <span className="bg-[#252525] px-2.5 py-0.5 rounded-full text-xs font-mono text-[#E07820] font-bold">
                {m.complexity}
              </span>
              <p className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
                {m.complexityDesc}
              </p>
              {m.notes && (
                <p className="text-[11px] text-[#4B5563] mt-1.5 border-t border-[#2a2a2a] pt-1.5 leading-relaxed">
                  {m.notes}
                </p>
              )}
            </div>

            {code && (
              <div className="mx-3 mb-3">
                <p className="text-[10px] text-[#6B7280] mb-1.5 flex items-center gap-1">
                  <FileCode size={10} /> Generated Code
                </p>
                <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-3
                                font-mono text-[11px] text-[#9CA3AF] overflow-x-auto
                                max-h-[140px] whitespace-pre leading-relaxed">
                  {code.slice(0, 500)}{code.length > 500 ? '\n…' : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-[#2a2a2a] space-y-2 shrink-0">
        <button onClick={handlePaste} disabled={profiling}
          className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-[#383838] text-white
                     text-xs py-2.5 rounded-xl flex items-center justify-center gap-2
                     transition-all disabled:opacity-50">
          {profiling ? <Loader2 size={12} className="animate-spin" /> : <ClipboardPaste size={12} />}
          Paste & Evaluate Code
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: codeLang.label, icon: <Download size={12} className="text-[#E07820]" />, fn: downloadCode },
            { label: 'PDF',          icon: <Download size={12} className="text-red-400" />,   fn: downloadPDF  },
            { label: 'JSON',         icon: <FileJson size={12} className="text-blue-400" />,  fn: downloadJSON },
          ].map(b => (
            <button key={b.label} onClick={b.fn}
              className="bg-[#1a1a1a] hover:bg-[#252525] border border-[#383838] text-white
                         text-[11px] py-2.5 rounded-xl flex flex-col items-center gap-1 transition-all">
              {b.icon}{b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
