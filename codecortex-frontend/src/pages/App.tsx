import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatPanel from '@/components/ChatPanel'
import ProfilingPanel from '@/components/ProfilingPanel'
import AuthModal from '@/components/AuthModal'
import SettingsModal from '@/components/SettingsModal'

export default function App() {
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212]">
      <Sidebar
        onOpenAuth={mode => setAuthModal(mode)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <ChatPanel
        onOpenAuth={mode => setAuthModal(mode)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <ProfilingPanel />

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
