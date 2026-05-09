import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatPanel from '@/components/ChatPanel'
import ProfilingPanel from '@/components/ProfilingPanel'
import AuthModal from '@/components/AuthModal'
import SettingsModal from '@/components/SettingsModal'

export default function App() {
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212]">

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={
          isMobile
            ? `fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'relative h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out'
        }
        style={!isMobile ? { width: sidebarOpen ? '280px' : '0px' } : {}}
      >
        <div className="w-[280px] h-full">
          <Sidebar
            onOpenAuth={mode => setAuthModal(mode)}
            onOpenSettings={() => setSettingsOpen(true)}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 min-w-0 h-full overflow-hidden">
        <ChatPanel
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          onOpenAuth={mode => setAuthModal(mode)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="hidden lg:flex h-full shrink-0">
          <ProfilingPanel />
        </div>
      </div>

      {authModal && (
        <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSwitchMode={mode => setAuthModal(mode)} />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
