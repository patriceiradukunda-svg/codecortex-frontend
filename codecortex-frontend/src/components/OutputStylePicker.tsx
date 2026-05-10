interface OutputStylePickerProps {
  onSelect: (style: 'clean' | 'commented' | 'guide') => void
  onCancel: () => void
}

const STYLES = [
  {
    id: 'clean' as const,
    icon: '🧹',
    label: 'Clean Code',
    desc: 'Just the code, no comments',
    color: 'border-blue-500/40 hover:border-blue-500',
    badge: 'bg-blue-500/10 text-blue-400',
  },
  {
    id: 'commented' as const,
    icon: '💬',
    label: 'Commented Code',
    desc: 'Code with inline comments explaining each step',
    color: 'border-[#7B3F00]/40 hover:border-[#9B5A1A]',
    badge: 'bg-[#7B3F00]/10 text-[#9B5A1A]',
  },
  {
    id: 'guide' as const,
    icon: '📖',
    label: 'Full Guide',
    desc: 'Code + explanation + installation steps',
    color: 'border-green-500/40 hover:border-green-500',
    badge: 'bg-green-500/10 text-green-400',
  },
]

export default function OutputStylePicker({ onSelect, onCancel }: OutputStylePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1a1a1a] border border-[#2c2c2c] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-5">
          <p className="text-white font-semibold text-base">Output Style</p>
          <p className="text-gray-500 text-xs mt-1">
            How would you like the generated code?
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => onSelect(style.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                         bg-[#111] transition-all text-left group ${style.color}`}
            >
              <span className="text-2xl">{style.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{style.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${style.badge}`}>
                    {style.id}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{style.desc}</p>
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
