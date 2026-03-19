import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, CheckSquare, StickyNote, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { BottomNavMore } from './BottomNavMore'

const primaryNav = [
  { to: '/',         icon: LayoutDashboard, label: 'Home',     end: true },
  { to: '/calendar', icon: CalendarDays,    label: 'Calendar', end: false },
  { to: '/tasks',    icon: CheckSquare,     label: 'Tasks',    end: false },
  { to: '/notes',    icon: StickyNote,      label: 'Notes',    end: false },
]

export function BottomNav() {
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      <div className="bottom-nav-wrap">
        <nav className="bottom-nav-pill">
          {primaryNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            className={`bottom-nav-item${showMore ? ' active' : ''}`}
            onClick={() => setShowMore(v => !v)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        </nav>
      </div>

      {showMore && <BottomNavMore onClose={() => setShowMore(false)} />}
    </>
  )
}
