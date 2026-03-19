import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Timer } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { QuickCapture } from '@/components/QuickCapture'
import { FocusTimer } from '@/components/FocusTimer'
import { useStore } from '@/stores/store'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useICloudSync } from '@/hooks/useICloudSync'

export function AppLayout() {
  const bgImage = useStore(s => s.backgroundImage)
  const collapsed = useStore(s => s.sidebarCollapsed)
  const isMobile = useIsMobile()
  const location = useLocation()
  const [showCapture, setShowCapture] = useState(false)
  const [showTimer, setShowTimer] = useState(false)

  // Kick off background iCloud polling (15-min interval)
  useICloudSync()

  // Scroll main content to top on route change
  useEffect(() => {
    const el = document.getElementById('main-scroll')
    el?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCapture(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const closeCapture = useCallback(() => setShowCapture(false), [])

  const bgStyle = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {}

  // Desktop sidebar width
  const sidebarW = collapsed ? 56 : 240

  return (
    <div
      className="app-bg"
      style={{ height: '100%', width: '100%', overflow: 'hidden', position: 'relative', ...bgStyle }}
    >
      {/* Desktop sidebar — fixed rail, does not push content */}
      {!isMobile && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}>
          <Sidebar />
        </div>
      )}

      {/* Mobile bottom nav pill */}
      {isMobile && <BottomNav />}

      {/* Global overlays */}
      {showCapture && <QuickCapture onClose={closeCapture} />}
      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}

      {/* Focus timer toggle (desktop only, bottom-right) */}
      {!isMobile && !showTimer && (
        <button
          onClick={() => setShowTimer(true)}
          className="btn-icon"
          title="Focus Timer (Pomodoro)"
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 100,
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Timer size={15} />
        </button>
      )}

      {/* Main content */}
      <main
        id="main-scroll"
        style={{
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          // Offset from the fixed sidebar on desktop
          paddingLeft: isMobile ? 0 : sidebarW,
          transition: 'padding-left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="app-main-content"
          style={{
            padding: isMobile ? '20px 16px 110px' : '36px 40px',
            maxWidth: isMobile ? '100%' : '1000px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  )
}
