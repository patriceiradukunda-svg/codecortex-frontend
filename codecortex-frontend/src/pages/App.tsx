import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatPanel from '@/components/ChatPanel'
import ProfilingPanel from '@/components/ProfilingPanel'
import AuthModal from '@/components/AuthModal'
import SettingsModal from '@/components/SettingsModal'

type BreakPoint = 'mobile' | 'tablet' | 'desktop'

function getBreakpoint(w: number): BreakPoint {
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export default function App() {
  const [authModal,    setAuthModal]    = useState<'login' | 'register' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bp,           setBp]           = useState<BreakPoint>(() => getBreakpoint(window.innerWidth))
  const [sidebarOpen,  setSidebarOpen]  = useState(() => window.innerWidth >= 1024)
  const [activeTab,    setActiveTab]    = useState<'chat' | 'profiler'>('chat')

  const isMobile = bp === 'mobile'
  const isTablet = bp === 'tablet'
  const isDesktop = bp === 'desktop'

  const onResize = useCallback(() => {
    const next = getBreakpoint(window.innerWidth)
    setBp(next)
    if (next === 'desktop') setSidebarOpen(true)
    if (next !== 'desktop') setSidebarOpen(false)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [onResize])

  const toggleSidebar = () => setSidebarOpen(p => !p)

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white">

      {/* ── Backdrop for mobile + tablet sidebar ── */}
      {!isDesktop && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          ${isDesktop
            ? 'relative h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out'
            : 'fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out shadow-2xl'
          }
        `}
        style={
          isDesktop
            ? { width: sidebarOpen ? '272px' : '0px' }
            : { transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }
        }
      >
        <div className="w-[272px] h-full">
          <Sidebar
            onOpenAuth={mode => setAuthModal(mode)}
            onOpenSettings={() => setSettingsOpen(true)}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">

        {/* ── Mobile / Tablet bottom tab bar ── */}
        {!isDesktop && (
          <div className="flex border-b border-gray-200 bg-white shrink-0 safe-top">
            {(['chat', 'profiler'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-all
                  ${activeTab === tab
                    ? 'text-[#E07820] border-b-2 border-[#E07820] bg-orange-50/50'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab === 'chat' ? '💬 Chat' : '📊 Profiler'}
              </button>
            ))}
          </div>
        )}

        {/* ── Content area ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Chat panel */}
          <div className={`
            flex flex-col min-w-0 h-full overflow-hidden
            ${isDesktop
              ? 'flex-1'
              : activeTab === 'chat' ? 'flex flex-1' : 'hidden'
            }
          `}>
            <ChatPanel
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
              onOpenAuth={mode => setAuthModal(mode)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>

          {/* Profiling panel */}
          <div className={`
            h-full overflow-hidden shrink-0
            ${isDesktop
              ? 'flex w-[288px] border-l border-gray-100'
              : activeTab === 'profiler' ? 'flex flex-1' : 'hidden'
            }
          `}>
            <ProfilingPanel />
          </div>
        </div>

        {/* ── Mobile bottom nav ── */}
        {isMobile && (
          <nav className="flex items-center justify-around px-4 py-2 bg-white
                          border-t border-gray-200 shrink-0 safe-bottom">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl
                         transition-all text-gray-400 hover:text-[#E07820]
                         hover:bg-orange-50 active:scale-95">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              <span className="text-[9px] font-medium">Chats</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl
                          transition-all active:scale-95
                ${activeTab === 'chat'
                  ? 'text-[#E07820] bg-orange-50'
                  : 'text-gray-400 hover:text-[#E07820] hover:bg-orange-50'
                }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="text-[9px] font-medium">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('profiler')}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl
                          transition-all active:scale-95
                ${activeTab === 'profiler'
                  ? 'text-[#E07820] bg-orange-50'
                  : 'text-gray-400 hover:text-[#E07820] hover:bg-orange-50'
                }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="14"/>
              </svg>
              <span className="text-[9px] font-medium">Profiler</span>
            </button>
          </nav>
        )}
      </div>

      {/* ── Modals ── */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitchMode={m => setAuthModal(m)}
        />
      )}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
