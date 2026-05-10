interface LanguagePickerProps {
  onSelect: (lang: 'C' | 'C++' | 'Python') => void
  onCancel: () => void
}

const LANGS = [
  {
    id: 'C' as const,
    label: 'C',
    icon: '⚙️',
    desc: 'Best for bare-metal embedded systems',
    color: 'border-blue-500/40 hover:border-blue-500',
    badge: 'bg-blue-500/10 text-blue-400',
  },
  {
    id: 'C++' as const,
    label: 'C++',
    icon: '🔧',
    desc: 'OOP support for complex firmware',
    color: 'border-[#7B3F00]/40 hover:border-[#9B5A1A]',
    badge: 'bg-[#7B3F00]/10 text-[#9B5A1A]',
  },
  {
    id: 'Python' as const,
    label: 'Python',
    icon: '🐍',
    desc: 'Best for Raspberry Pi and high-level CV',
    color: 'border-green-500/40 hover:border-green-500',
    badge: 'bg-green-500/10 text-green-400',
  },
]

export default function LanguagePicker({ onSelect, onCancel }: LanguagePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-5">
          <p className="text-white font-semibold text-base">Choose Language</p>
          <p className="text-gray-500 text-xs mt-1">
            Which language should the code be generated in?
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {LANGS.map(lang => (
            <button
              key={lang.id}
              onClick={() => onSelect(lang.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                         bg-[#111] transition-all text-left group ${lang.color}`}
            >
              <span className="text-2xl">{lang.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{lang.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${lang.badge}`}>
                    {lang.id}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{lang.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
