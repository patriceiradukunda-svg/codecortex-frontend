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

      {/* ── Sidebar — animates width 0 ↔ 280px via inline style ── */}
      <div
        style={{ width: sidebarOpen ? '280px' : '0px' }}
        className="transition-[width] duration-300 ease-in-out shrink-0 overflow-hidden h-full"
      >
        {/* Inner div stays 280px so content doesn't squish during animation */}
        <div className="w-[280px] h-full">
          <Sidebar
            onOpenAuth={mode => setAuthModal(mode)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      {/* ── Main area (chat + profiler) ── */}
      <div className="flex flex-1 min-w-0 h-full overflow-hidden">
        <ChatPanel
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onOpenAuth={mode => setAuthModal(mode)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        {/* ProfilingPanel hidden on screens smaller than lg (1024px) */}
        <div className="hidden lg:flex h-full shrink-0">
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
