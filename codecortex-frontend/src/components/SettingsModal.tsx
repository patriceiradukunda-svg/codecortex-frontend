import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { DEVICES } from '@/types'

interface SettingsModalProps { onClose: () => void }

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [defaultDevice, setDefaultDevice] = useState(
    () => localStorage.getItem('defaultDevice') || 'STM32H7')
  const [codeStyle, setCodeStyle] = useState(
    () => localStorage.getItem('codeStyle') || 'concise')
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark')

  const save = () => {
    localStorage.setItem('defaultDevice', defaultDevice)
    localStorage.setItem('codeStyle', codeStyle)
    localStorage.setItem('theme', theme)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card border border-choco/30 rounded-2xl w-[400px] p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Default MCU Target</label>
            <select className="input-dark" value={defaultDevice} onChange={e => setDefaultDevice(e.target.value)}>
              {DEVICES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Code Generation Style</label>
            <select className="input-dark" value={codeStyle} onChange={e => setCodeStyle(e.target.value)}>
              <option value="concise">Concise (minimal comments)</option>
              <option value="verbose">Verbose (full comments)</option>
              <option value="educational">Educational (step-by-step)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Theme</label>
            <select className="input-dark" value={theme} onChange={e => setTheme(e.target.value)}>
              <option value="dark">Dark (default)</option>
              <option value="darker">Darker (OLED)</option>
            </select>
          </div>
        </div>

        <button onClick={save} className="btn-choco w-full py-2.5 mt-5 flex items-center justify-center gap-2 text-sm">
          <Save size={15} /> Save Settings
        </button>
      </div>
    </div>
  )
}
