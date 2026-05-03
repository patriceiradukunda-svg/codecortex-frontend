import { useState } from 'react'
import { Activity, Download, FileCode, FileJson, MemoryStick, Zap, Clock, GitBranch, ClipboardPaste, Loader2 } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { ProfilingMetrics } from '@/types'
import jsPDF from 'jspdf'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  unit: string
  desc?: string
  color?: string
}
function MetricCard({ icon, label, value, unit, desc, color = 'text-choco-light' }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="text-gray-500 mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] font-medium text-gray-400">{unit}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {desc && <div className="text-[10px] text-gray-600 mt-1 leading-tight">{desc}</div>}
    </div>
  )
}

export default function ProfilingPanel() {
  const { activeChat, profileCode, generating } = useChat()
  const [profiling, setProfiling] = useState(false)

  const m: ProfilingMetrics | undefined = activeChat?.lastMetrics
  const code = activeChat?.lastCode

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
    doc.setFontSize(13)
    doc.text('Resource Profile', 20, 67)
    doc.setFontSize(11)
    doc.text(`Flash (Code Size): ${m.flash} KB`, 25, 77)
    doc.text(`RAM (Memory Usage): ${m.ram} KB`, 25, 85)
    doc.text(`Processing Latency: ${m.latency} ms/frame`, 25, 93)
    doc.text(`Energy per Frame: ${m.energy} mJ`, 25, 101)
    doc.text(`Time Complexity: ${m.complexity}`, 25, 109)
    doc.text(`Notes: ${m.complexityDesc}`, 25, 117)
    if (code) {
      doc.line(20, 125, 190, 125)
      doc.setFontSize(13)
      doc.text('Generated Code (preview)', 20, 135)
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
    <div className="w-[380px] bg-[#111] border-l border-border flex flex-col overflow-y-auto">
      <div className="px-4 py-3.5 bg-black/40 border-b border-choco/40 flex items-center gap-2 shrink-0">
        <Activity size={18} className="text-choco-light" />
        <div>
          <h3 className="text-sm font-semibold text-white">Resource Profiler</h3>
          <p className="text-[10px] text-gray-500">
            {generating ? (
              <span className="flex items-center gap-1 text-choco-light">
                <Loader2 size={10} className="animate-spin" /> Generating…
              </span>
            ) : m ? `✅ Profiled: ${activeChat?.lastMcu}` : 'Send a message to profile'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <MetricCard icon={<FileCode size={16} />} label="Code Size (Flash)" value={m?.flash ?? '—'} unit="KB" />
        <MetricCard icon={<MemoryStick size={16} />} label="Memory Usage (RAM)" value={m?.ram ?? '—'} unit="KB" color="text-amber-400" />
        <MetricCard icon={<Clock size={16} />} label="Processing Speed" value={m?.latency ?? '—'} unit="ms / frame" color="text-blue-400" />
        <MetricCard icon={<Zap size={16} />} label="Energy per Frame" value={m?.energy ?? '—'} unit="mJ" color="text-green-400" />
      </div>

      {m && (
        <div className="mx-4 mb-4 bg-card rounded-xl p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-gray-300">Time Complexity</span>
          </div>
          <span className="bg-border px-2.5 py-0.5 rounded-full text-xs font-mono text-choco-light font-bold">
            {m.complexity}
          </span>
          <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{m.complexityDesc}</p>
        </div>
      )}

      {code && (
        <div className="mx-4 mb-4">
          <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
            <FileCode size={12} /> Generated Code
          </p>
          <div className="code-block text-gray-300 max-h-[180px]">
            {code.slice(0, 800)}{code.length > 800 ? '\n…' : ''}
          </div>
        </div>
      )}

      <div className="p-4 pt-0 space-y-2 mt-auto">
        <button
          onClick={handlePasteEval}
          disabled={profiling}
          className="w-full bg-[#2c2c2c] hover:bg-[#3c3c3c] text-white text-xs py-2 rounded-xl
                     flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {profiling ? <Loader2 size={13} className="animate-spin" /> : <ClipboardPaste size={13} />}
          Paste & Evaluate Code
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={downloadCode} className="bg-[#2c2c2c] hover:bg-[#3c3c3c] text-white text-[11px] py-2 rounded-xl flex flex-col items-center gap-1 transition-all">
            <Download size={13} className="text-choco-light" /> .c file
          </button>
          <button onClick={downloadPDF} className="bg-[#2c2c2c] hover:bg-[#3c3c3c] text-white text-[11px] py-2 rounded-xl flex flex-col items-center gap-1 transition-all">
            <Download size={13} className="text-red-400" /> PDF
          </button>
          <button onClick={downloadJSON} className="bg-[#2c2c2c] hover:bg-[#3c3c3c] text-white text-[11px] py-2 rounded-xl flex flex-col items-center gap-1 transition-all">
            <FileJson size={13} className="text-blue-400" /> JSON
          </button>
        </div>
      </div>
    </div>
  )
}
