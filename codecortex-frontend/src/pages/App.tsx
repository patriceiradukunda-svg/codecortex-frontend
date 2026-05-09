import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatPanel from '@/components/ChatPanel'
import ProfilingPanel from '@/components/ProfilingPanel'
import AuthModal from '@/components/AuthModal'
import SettingsModal from '@/components/SettingsModal'

export default function App() {
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212]">
      {/* Sidebar — hidden when toggled, slides off-screen on mobile */}
      <div
        className={`
          transition-all duration-300 ease-in-out shrink-0
          ${sidebarOpen ? 'w-[280px]' : 'w-0'}
          overflow-hidden
        `}
      >
        <Sidebar
          onOpenAuth={mode => setAuthModal(mode)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      {/* Main content — grows to fill available space */}
      <div className="flex flex-1 min-w-0 h-full">
        <ChatPanel
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onOpenAuth={mode => setAuthModal(mode)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {/* Profiling panel — hidden on small screens */}
        <div className="hidden lg:block shrink-0">
          <ProfilingPanel />
        </div>
      </div>

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitchMode={mode => setAuthModal(mode)}
        />
      )}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
