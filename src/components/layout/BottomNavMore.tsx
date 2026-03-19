import { NavLink } from 'react-router-dom'
import { Target, Heart, Image, UtensilsCrossed, Archive, Settings, FileText, X } from 'lucide-react'
import { useStore } from '@/stores/store'
import { useEffect, useRef } from 'react'

const moreNav = [
  { to: '/goals',        icon: Target,          label: 'Goals' },
  { to: '/recipes',      icon: UtensilsCrossed, label: 'Meal Planner' },
  { to: '/backlog',      icon: Archive,         label: 'Backlog' },
  { to: '/life-events',  icon: Heart,           label: 'Life Events' },
  { to: '/vision-board', icon: Image,           label: 'Vision Board' },
  { to: '/settings',     icon: Settings,        label: 'Settings' },
]

interface Props {
  onClose: () => void
}

export function BottomNavMore({ onClose }: Props) {
  const pages = useStore(s => s.customPages)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current === e.target) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 16px 96px',
        animation: 'card-enter 0.25s var(--ease-out) both',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'var(--blur-lg)',
          WebkitBackdropFilter: 'var(--blur-lg)',
          border: '1px solid var(--glass-border)',
          borderTopColor: 'var(--glass-specular)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--glass-shadow-lg)',
          overflow: 'hidden',
          animation: 'float-up 0.3s var(--ease-out) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <span className="label">More</span>
          <button className="btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        {/* Nav grid */}
        <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {moreNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `more-nav-item${isActive ? ' active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {pages.map(page => (
            <NavLink
              key={page.id}
              to={`/page/${page.id}`}
              onClick={onClose}
              className={({ isActive }) => `more-nav-item${isActive ? ' active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <FileText size={22} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {page.title}
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
