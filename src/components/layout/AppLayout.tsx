import { useState, useCallback, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useStore } from '@/stores/store'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useICloudSync } from '@/hooks/useICloudSync'

export function AppLayout() {
  const bgImage = useStore(s => s.backgroundImage)
  const isMobile = useIsMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Kick off background iCloud polling (15-min interval)
  useICloudSync()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  const bgStyle = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {}

  return (
    <div
      className="app-bg"
      style={{ height: '100%', width: '100%', display: 'flex', overflow: 'hidden', ...bgStyle }}
    >
      {/* Mobile: backdrop overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 39,
            transition: 'opacity 0.2s',
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={isMobile ? {
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 40,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        } : undefined}
      >
        <Sidebar forceMobileExpanded={isMobile && mobileMenuOpen} onNavClick={isMobile ? closeMobileMenu : undefined} />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid var(--glass-border)',
              background: 'var(--sidebar-bg)',
              backdropFilter: 'var(--blur-sm)',
              WebkitBackdropFilter: 'var(--blur-sm)',
              position: 'sticky',
              top: 0,
              zIndex: 20,
            }}
          >
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="btn-icon"
              style={{ flexShrink: 0 }}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Life OS
            </span>
          </div>
        )}

        <div
          className="app-main-content"
          style={{
            padding: isMobile ? '16px 14px' : '32px 36px',
            maxWidth: '960px',
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
