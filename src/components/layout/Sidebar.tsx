import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, CheckSquare, Target, Sparkles,
  Heart, Image, Plus, Sun, Moon, FileText, Archive, PanelLeft, PanelLeftClose, Settings, X
} from 'lucide-react'
import { useStore, useActions } from '@/stores/store'

const mainNav = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar',   icon: CalendarDays,    label: 'Calendar' },
  { to: '/tasks',      icon: CheckSquare,     label: 'Tasks' },
  { to: '/backlog',    icon: Archive,         label: 'Backlog' },
  { to: '/goals',      icon: Target,          label: 'Goals' },
  { to: '/life-events',icon: Heart,           label: 'Life Events' },
  { to: '/vision-board',icon: Image,          label: 'Vision Board' },
]

interface SidebarProps {
  forceMobileExpanded?: boolean
  onNavClick?: () => void
}

export function Sidebar({ forceMobileExpanded, onNavClick }: SidebarProps) {
  const collapsed = useStore(s => s.sidebarCollapsed)
  const theme     = useStore(s => s.theme)
  const pages     = useStore(s => s.customPages)
  const { toggleSidebar, toggleTheme } = useActions()
  const navigate  = useNavigate()

  // On mobile, always show expanded when open
  const isExpanded = forceMobileExpanded || !collapsed
  const w = isExpanded ? 240 : 56

  const handleNavClick = () => {
    onNavClick?.()
  }

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="sidebar"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}
    >
      {/* Logo row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 10px 10px',
        borderBottom: '1px solid var(--sidebar-border)',
        minHeight: 52,
      }}>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}
            >
              <Sparkles size={15} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Life OS
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          className="btn-icon"
          onClick={forceMobileExpanded ? onNavClick : toggleSidebar}
          style={{ marginLeft: !isExpanded ? 'auto' : 0, flexShrink: 0 }}
        >
          {forceMobileExpanded
            ? <X size={15} />
            : collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {mainNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title={!isExpanded ? item.label : undefined}
            style={{ justifyContent: !isExpanded ? 'center' : undefined }}
            onClick={handleNavClick}
          >
            <item.icon size={16} className="nav-item-icon" style={{ opacity: 1 }} />
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.16 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}

        {pages.length > 0 && (
          <>
            <div style={{ padding: '14px 12px 4px' }}>
              {isExpanded && <span className="label">Pages</span>}
            </div>
            {pages.map(page => (
              <NavLink
                key={page.id}
                to={`/page/${page.id}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ justifyContent: !isExpanded ? 'center' : undefined }}
                title={!isExpanded ? page.title : undefined}
                onClick={handleNavClick}
              >
                <FileText size={15} className="nav-item-icon" />
                {isExpanded && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {page.title}
                  </span>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '6px 6px 12px', borderTop: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={() => { navigate('/new-page'); handleNavClick() }}
          className="nav-item"
          style={{ justifyContent: !isExpanded ? 'center' : undefined, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <Plus size={16} className="nav-item-icon" />
          {isExpanded && <span>New Page</span>}
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          style={{ justifyContent: !isExpanded ? 'center' : undefined }}
          title={!isExpanded ? 'Settings' : undefined}
          onClick={handleNavClick}
        >
          <Settings size={16} className="nav-item-icon" />
          {isExpanded && <span>Settings</span>}
        </NavLink>
        <button
          onClick={toggleTheme}
          className="nav-item"
          style={{ justifyContent: !isExpanded ? 'center' : undefined, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          {theme === 'dark'
            ? <Sun size={16} className="nav-item-icon" />
            : <Moon size={16} className="nav-item-icon" />}
          {isExpanded && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>
    </motion.aside>
  )
}
