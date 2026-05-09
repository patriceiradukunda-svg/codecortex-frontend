import { useState } from 'react'
import {
  Activity, Download, FileCode, FileJson, MemoryStick,
  Zap, Clock, GitBranch, ClipboardPaste, Loader2, BarChart3,
} from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { ProfilingMetrics } from '@/types'
import jsPDF from 'jspdf'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  unit: string
  color?: string
  hasData: boolean
}

function MetricCard({ icon, label, value, unit, color = 'text-[#9B5A1A]', hasData }: MetricCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex flex-col items-center text-center gap-1">
      <div className={`${hasData ? color : 'text-gray-700'} transition-colors`}>{icon}</div>
      <div className={`text-xl font-bold transition-colors ${hasData ? color : 'text-gray-700'}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-600">{unit}</div>
      <div className="text-[10px] text-gray-500 leading-tight">{label}</div>
    </div>
  )
}

export default function ProfilingPanel() {
  const { activeChat, profileCode, generating } = useChat()
  const [profiling, setProfiling] = useState(false)

  const m: ProfilingMetrics | undefined = activeChat?.lastMetrics
  const code = activeChat?.lastCode
  const hasData = !!m

  const handlePasteEval = async () => {
    const input = prompt('Paste your C/C++ code:')
    if (!input) return
    setProfiling(true)
    await profileCode(input, activeChat?.lastMcu || 'STM32H7')
    setProfiling(false)
  }

  const downloadCode = () => {
    if (!code) return alert('Generate code first')
    const blob = new Blob([code], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `firmware_${activeChat?.lastMcu || 'mcu'}.c`
    a.click()
  }

  const downloadPDF = () => {
    if (!m) return alert('No profiling data available')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('CodeCortex Pro — Profiling Report', 20, 20)
    doc.setFontSize(11)
    doc.text(`Session: ${activeChat?.title || 'Untitled'}`, 20, 35)
    doc.text(`MCU: ${activeChat?.lastMcu || 'N/A'}  Camera: ${activeChat?.lastCamera || 'N/A'}`, 20, 43)
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 51)
    doc.line(20, 57, 190, 57)
    doc.setFontSize(13); doc.text('Resource Profile', 20, 67)
    doc.setFontSize(11)
    doc.text(`Flash: ${m.flash} KB`, 25, 77)
    doc.text(`RAM: ${m.ram} KB`, 25, 85)
    doc.text(`Latency: ${m.latency} ms/frame`, 25, 93)
    doc.text(`Energy: ${m.energy} mJ`, 25, 101)
    doc.text(`Complexity: ${m.complexity}`, 25, 109)
    doc.text(`Notes: ${m.complexityDesc}`, 25, 117)
    if (code) {
      doc.line(20, 125, 190, 125)
      doc.setFontSize(13); doc.text('Generated Code (preview)', 20, 135)
      doc.setFontSize(8)
      doc.text(doc.splitTextToSize(code.slice(0, 1500), 170), 20, 143)
    }
    doc.save(`profile_${activeChat?.id || 'report'}.pdf`)
  }

  const downloadJSON = () => {
    const data = {
      session: activeChat?.title,
      mcu: activeChat?.lastMcu,
      camera: activeChat?.lastCamera,
      metrics: m,
      messages: activeChat?.messages,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `chat_${activeChat?.id || 'session'}.json`
    a.click()
  }

  return (
    // fix #5 — narrowed from 380px to 300px
    <div className="w-full lg:w-[300px] bg-[#111] border-l border-[#2c2c2c] flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 bg-[#0d0d0d] border-b border-[#2c2c2c] flex items-center gap-2 shrink-0">
        <Activity size={16} className="text-[#9B5A1A]" />
        <div>
          <h3 className="text-sm font-semibold text-white">Resource Profiler</h3>
          <p className="text-[10px] text-gray-600">
            {generating ? (
              <span className="flex items-center gap-1 text-[#9B5A1A]">
                <Loader2 size={9} className="animate-spin" /> Generating…
              </span>
            ) : hasData
              ? `✅ ${activeChat?.lastMcu} · ${activeChat?.lastCamera}`
              : 'Send a message to profile'
            }
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* fix #1 — empty state when no data */}
        {!hasData && (
          <div className="flex flex-col items-center justify-center text-center px-6 py-10 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a]
                            flex items-center justify-center">
              <BarChart3 size={24} className="text-gray-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">No data yet</p>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                Generate embedded code in the chat to see flash, RAM, speed and energy metrics here.
              </p>
            </div>
            <button
              onClick={handlePasteEval}
              disabled={profiling}
              className="text-xs text-[#9B5A1A] border border-[#7B3F00]/30 hover:bg-[#7B3F00]/10
                         px-4 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {profiling ? <Loader2 size={12} className="animate-spin" /> : <ClipboardPaste size={12} />}
              Or paste code to evaluate
            </button>
          </div>
        )}

        {/* Metric cards */}
        {hasData && (
          <>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MetricCard icon={<FileCode size={15} />}    label="Code Size (Flash)" value={m?.flash ?? '—'} unit="KB"         hasData={hasData} />
              <MetricCard icon={<MemoryStick size={15} />} label="Memory (RAM)"       value={m?.ram ?? '—'}   unit="KB"         color="text-amber-400" hasData={hasData} />
              <MetricCard icon={<Clock size={15} />}       label="Processing Speed"   value={m?.latency ?? '—'} unit="ms/frame" color="text-blue-400"  hasData={hasData} />
              <MetricCard icon={<Zap size={15} />}         label="Energy per Frame"   value={m?.energy ?? '—'} unit="mJ"        color="text-green-400" hasData={hasData} />
            </div>

            {m && (
              <div className="mx-3 mb-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch size={13} className="text-purple-400" />
                  <span className="text-xs font-semibold text-gray-300">Time Complexity</span>
                </div>
                <span className="bg-[#2a2a2a] px-2.5 py-0.5 rounded-full text-xs font-mono text-[#9B5A1A] font-bold">
                  {m.complexity}
                </span>
                <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">{m.complexityDesc}</p>
                {m.notes && (
                  <p className="text-[11px] text-gray-700 mt-1.5 leading-relaxed border-t border-[#2a2a2a] pt-1.5">
                    {m.notes}
                  </p>
                )}
              </div>
            )}

            {code && (
              <div className="mx-3 mb-3">
                <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                  <FileCode size={11} /> Generated Code
                </p>
                <div className="bg-black/60 border border-[#2a2a2a] rounded-xl p-3 font-mono text-[11px]
                                text-gray-400 overflow-x-auto max-h-[160px] whitespace-pre-wrap leading-relaxed">
                  {code.slice(0, 600)}{code.length > 600 ? '\n…' : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons — always visible */}
      <div className="p-3 border-t border-[#2c2c2c] space-y-2 shrink-0">
        <button
          onClick={handlePasteEval}
          disabled={profiling}
          className="w-full bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#2c2c2c] text-white text-xs
                     py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {profiling ? <Loader2 size={12} className="animate-spin" /> : <ClipboardPaste size={12} />}
          Paste & Evaluate Code
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: '.c file', icon: <Download size={12} className="text-[#9B5A1A]" />, fn: downloadCode },
            { label: 'PDF',     icon: <Download size={12} className="text-red-400" />,   fn: downloadPDF },
            { label: 'JSON',    icon: <FileJson size={12} className="text-blue-400" />,  fn: downloadJSON },
          ].map(b => (
            <button
              key={b.label}
              onClick={b.fn}
              className="bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#2c2c2c] text-white
                         text-[11px] py-2 rounded-xl flex flex-col items-center gap-1 transition-all"
            >
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
