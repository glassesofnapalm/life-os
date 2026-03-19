import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, CheckSquare, StickyNote, CalendarDays, Target,
  LayoutDashboard, Settings, ArrowRight,
} from 'lucide-react'
import { useStore, addTask, addNote } from '@/stores/store'
import { format } from 'date-fns'

interface QuickCaptureProps {
  onClose: () => void
}

type ActionType = 'task' | 'note' | 'navigate'

interface Action {
  id: string
  type: ActionType
  icon: React.ReactNode
  label: string
  detail?: string
  run: () => void
}

export function QuickCapture({ onClose }: QuickCaptureProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const tasks = useStore(s => s.tasks)
  const notes = useStore(s => s.notes)
  const noteFolders = useStore(s => s.noteFolders)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const staticActions: Action[] = [
    {
      id: 'nav-home',     type: 'navigate', icon: <LayoutDashboard size={15} />,
      label: 'Go to Dashboard',
      run: () => { navigate('/'); onClose() },
    },
    {
      id: 'nav-tasks',    type: 'navigate', icon: <CheckSquare size={15} />,
      label: 'Go to Tasks',
      run: () => { navigate('/tasks'); onClose() },
    },
    {
      id: 'nav-calendar', type: 'navigate', icon: <CalendarDays size={15} />,
      label: 'Go to Calendar',
      run: () => { navigate('/calendar'); onClose() },
    },
    {
      id: 'nav-goals',    type: 'navigate', icon: <Target size={15} />,
      label: 'Go to Goals',
      run: () => { navigate('/goals'); onClose() },
    },
    {
      id: 'nav-notes',    type: 'navigate', icon: <StickyNote size={15} />,
      label: 'Go to Notes',
      run: () => { navigate('/notes'); onClose() },
    },
    {
      id: 'nav-settings', type: 'navigate', icon: <Settings size={15} />,
      label: 'Go to Settings',
      run: () => { navigate('/settings'); onClose() },
    },
  ]

  const actions: Action[] = query.trim()
    ? [
        // "Add task: …"
        {
          id: 'add-task',
          type: 'task',
          icon: <CheckSquare size={15} />,
          label: `Add task: "${query}"`,
          detail: `Due today`,
          run: () => {
            addTask({
              title: query.trim(),
              priority: 'medium',
              status: 'today',
              due_date: format(new Date(), 'yyyy-MM-dd'),
              tags: [],
              notes: '',
            })
            onClose()
          },
        },
        // "Add note: …" — into first folder or no folder
        {
          id: 'add-note',
          type: 'note',
          icon: <StickyNote size={15} />,
          label: `Add note: "${query}"`,
          detail: noteFolders[0]?.name ?? 'Notes',
          run: () => {
            const folder = noteFolders[0]
            if (folder) {
              addNote(folder.id, query.trim())
            }
            navigate('/notes')
            onClose()
          },
        },
        // Filter existing tasks
        ...tasks
          .filter(t => t.title.toLowerCase().includes(query.toLowerCase()) && t.status !== 'done')
          .slice(0, 3)
          .map(t => ({
            id: `task-${t.id}`,
            type: 'navigate' as ActionType,
            icon: <CheckSquare size={15} />,
            label: t.title,
            detail: `Task · ${t.status}`,
            run: () => { navigate('/tasks'); onClose() },
          })),
        // Filter notes
        ...notes
          .filter(n => n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3)
          .map(n => ({
            id: `note-${n.id}`,
            type: 'navigate' as ActionType,
            icon: <StickyNote size={15} />,
            label: n.title || 'Untitled',
            detail: `Note`,
            run: () => { navigate('/notes'); onClose() },
          })),
        // Static nav filtered
        ...staticActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase())),
      ]
    : staticActions

  const clampedSelected = Math.min(selected, actions.length - 1)

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, actions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      actions[clampedSelected]?.run()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [actions, clampedSelected, onClose])

  useEffect(() => {
    setSelected(0)
  }, [query])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.30)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '18vh',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'float-up 0.22s var(--ease-out) both',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search or create…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 15,
              color: 'var(--text-primary)', fontFamily: 'inherit',
              letterSpacing: '-0.01em',
            }}
          />
          <kbd style={{
            fontSize: 10, color: 'var(--text-tertiary)',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '2px 5px', background: 'var(--surface)',
          }}>ESC</kbd>
        </div>

        {/* Actions list */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px' }}>
          {actions.length === 0 && (
            <p className="body-xs" style={{ padding: '16px', textAlign: 'center' }}>No results</p>
          )}
          {actions.map((action, i) => (
            <button
              key={action.id}
              onClick={action.run}
              onMouseEnter={() => setSelected(i)}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                background: i === clampedSelected ? 'var(--surface-active)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: 'var(--text-primary)',
                transition: 'background 0.10s',
              }}
            >
              <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{action.icon}</span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 400 }}>{action.label}</span>
              {action.detail && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{action.detail}</span>
              )}
              {i === clampedSelected && (
                <ArrowRight size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16,
        }}>
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['esc', 'Close']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ fontSize: 10, color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', background: 'var(--surface)' }}>
                {key}
              </kbd>
              <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
