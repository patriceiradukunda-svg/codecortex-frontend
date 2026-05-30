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
        background:   active ? bg      : '#f9fafb',
        border:       `1px solid ${active ? border : '#e5e7eb'}`,
        boxShadow:    active ? `0 2px 8px ${color}18` : 'none',
      }}
    >
      <div style={{ color: active ? color : '#d1d5db' }}>{icon}</div>
      <div className="text-xl font-bold font-mono" style={{ color: active ? color : '#d1d5db' }}>
        {value}
      </div>
      <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{unit}</div>
      <div className="text-[10px] leading-tight" style={{ color: '#6B7280' }}>{label}</div>
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

export default function ProfilingPanel() {
  const { activeChat, profileCode, generating } = useChat()
  const [profiling, setProfiling] = useState(false)

  const m        = activeChat?.lastMetrics
  const code     = activeChat?.lastCode
  const codeLang = detectCodeLang(code)

  const handlePaste = async () => {
    const input = prompt('Paste your C/C++ code:')
    if (!input) return
    setProfiling(true)
    await profileCode(input, activeChat?.lastMcu || 'STM32H7')
    setProfiling(false)
  }

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
    <div className="w-full lg:w-[288px] flex flex-col h-full overflow-hidden"
      style={{
        background:  'linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)',
        borderLeft:  '1px solid #e8e8e8',
      }}>

      {/* ── Header ── */}
      <div className="px-4 py-3 flex items-center gap-2 shrink-0"
        style={{
          background:   '#ffffff',
          borderBottom: '1px solid #eeeeee',
          boxShadow:    '0 1px 3px rgba(0,0,0,0.04)',
        }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background:  'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
            border:      '1px solid #fdba74',
          }}>
          <Activity size={14} style={{ color: '#E07820' }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>
            Resource Profiler
          </h3>
          <p className="text-[10px] truncate">
            {generating ? (
              <span className="flex items-center gap-1" style={{ color: '#E07820' }}>
                <Loader2 size={9} className="animate-spin" /> Generating…
              </span>
            ) : m
              ? <span style={{ color: '#16a34a' }}>✅ {activeChat?.lastMcu} · {activeChat?.lastCamera}</span>
              : <span style={{ color: '#9CA3AF' }}>Send a message to profile</span>
            }
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Empty state ── */}
        {!m && (
          <div className="flex flex-col items-center justify-center text-center px-5 py-12 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: '#f3f4f6',
                border:     '1px solid #e5e7eb',
              }}>
              <BarChart3 size={22} style={{ color: '#d1d5db' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                No profiling data yet
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#9CA3AF' }}>
                Generate code in the chat to see Flash, RAM, speed
                and energy metrics here.
              </p>
            </div>
            <button
              onClick={handlePaste}
              disabled={profiling}
              className="text-xs px-4 py-2 rounded-xl transition-all
                         disabled:opacity-50 flex items-center gap-1.5 font-medium"
              style={{
                color:      '#C06A1A',
                border:     '1px solid #fed7aa',
                background: '#fff7ed',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#ffedd5'
                ;(e.currentTarget as HTMLElement).style.borderColor = '#C06A1A'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#fff7ed'
                ;(e.currentTarget as HTMLElement).style.borderColor = '#fed7aa'
              }}
            >
              {profiling
                ? <Loader2 size={12} className="animate-spin" />
                : <ClipboardPaste size={12} />
              }
              Paste code to evaluate
            </button>
          </div>
        )}

        {/* ── Metric cards ── */}
        {m && (
          <>
            <div className="grid grid-cols-2 gap-2 p-3">
              <MetricCard
                icon={<FileCode size={14} />}
                label="Code Size (Flash)"
                value={m.flash}
                unit="KB"
                color="#E07820"
                bg="#fff7ed"
                border="#fed7aa"
                active={!!m}
              />
              <MetricCard
                icon={<MemoryStick size={14} />}
                label="Memory (RAM)"
                value={m.ram}
                unit="KB"
                color="#d97706"
                bg="#fffbeb"
                border="#fde68a"
                active={!!m}
              />
              <MetricCard
                icon={<Clock size={14} />}
                label="Processing Speed"
                value={m.latency}
                unit="ms/frame"
                color="#2563eb"
                bg="#eff6ff"
                border="#bfdbfe"
                active={!!m}
              />
              <MetricCard
                icon={<Zap size={14} />}
                label="Energy per Frame"
                value={m.energy}
                unit="mJ"
                color="#16a34a"
                bg="#f0fdf4"
                border="#bbf7d0"
                active={!!m}
              />
            </div>

            {/* ── Complexity card ── */}
            <div className="mx-3 mb-3 rounded-xl p-3"
              style={{
                background: '#ffffff',
                border:     '1px solid #e5e7eb',
                boxShadow:  '0 1px 4px rgba(0,0,0,0.04)',
              }}>
              <div className="flex items-center gap-1.5 mb-2">
                <GitBranch size={12} style={{ color: '#7c3aed' }} />
                <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                  Time Complexity
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold"
                style={{
                  background: '#f5f3ff',
                  color:      '#7c3aed',
                  border:     '1px solid #ddd6fe',
                }}>
                {m.complexity}
              </span>
              <p className="text-[11px] mt-2 leading-relaxed" style={{ color: '#6B7280' }}>
                {m.complexityDesc}
              </p>
              {m.notes && (
                <p className="text-[11px] mt-1.5 pt-1.5 leading-relaxed"
                  style={{
                    color:       '#9CA3AF',
                    borderTop:   '1px solid #f3f4f6',
                  }}>
                  {m.notes}
                </p>
              )}
            </div>

            {/* ── Code preview ── */}
            {code && (
              <div className="mx-3 mb-3">
                <p className="text-[10px] mb-1.5 flex items-center gap-1"
                  style={{ color: '#9CA3AF' }}>
                  <FileCode size={10} /> Generated Code Preview
                </p>
                <div className="rounded-xl p-3 font-mono text-[11px] overflow-x-auto
                                max-h-[140px] whitespace-pre leading-relaxed"
                  style={{
                    background: '#1e1e1e',
                    border:     '1px solid #374151',
                    color:      '#d1d5db',
                  }}>
                  {code.slice(0, 500)}{code.length > 500 ? '\n…' : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="p-3 space-y-2 shrink-0"
        style={{ borderTop: '1px solid #eeeeee', background: '#ffffff' }}>

        {/* Paste & Evaluate */}
        <button
          onClick={handlePaste}
          disabled={profiling}
          className="w-full text-xs py-2.5 rounded-xl flex items-center justify-center
                     gap-2 transition-all disabled:opacity-50 font-medium"
          style={{
            background: '#f9fafb',
            border:     '1px solid #e5e7eb',
            color:      '#374151',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background    = '#fff7ed'
            ;(e.currentTarget as HTMLElement).style.borderColor  = '#C06A1A'
            ;(e.currentTarget as HTMLElement).style.color        = '#C06A1A'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background   = '#f9fafb'
            ;(e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'
            ;(e.currentTarget as HTMLElement).style.color       = '#374151'
          }}
        >
          {profiling
            ? <Loader2 size={12} className="animate-spin" />
            : <ClipboardPaste size={12} />
          }
          Paste & Evaluate Code
        </button>

        {/* Download buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            {
              label: codeLang.label,
              icon:  <Download size={12} style={{ color: '#E07820' }} />,
              fn:    downloadCode,
              hover: { bg: '#fff7ed', border: '#C06A1A', text: '#C06A1A' },
            },
            {
              label: 'PDF',
              icon:  <Download size={12} style={{ color: '#dc2626' }} />,
              fn:    downloadPDF,
              hover: { bg: '#fff5f5', border: '#ef4444', text: '#dc2626' },
            },
            {
              label: 'JSON',
              icon:  <FileJson size={12} style={{ color: '#2563eb' }} />,
              fn:    downloadJSON,
              hover: { bg: '#eff6ff', border: '#3b82f6', text: '#2563eb' },
            },
          ].map(b => (
            <button
              key={b.label}
              onClick={b.fn}
              className="text-[11px] py-2.5 rounded-xl flex flex-col items-center
                         gap-1 transition-all font-medium"
              style={{
                background: '#f9fafb',
                border:     '1px solid #e5e7eb',
                color:      '#6B7280',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background   = b.hover.bg
                ;(e.currentTarget as HTMLElement).style.borderColor = b.hover.border
                ;(e.currentTarget as HTMLElement).style.color       = b.hover.text
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background   = '#f9fafb'
                ;(e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'
                ;(e.currentTarget as HTMLElement).style.color       = '#6B7280'
              }}
            >
              {b.icon}
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
