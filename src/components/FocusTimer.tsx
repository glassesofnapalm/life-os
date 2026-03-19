import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, X, Minus, Coffee } from 'lucide-react'
import { addFocusSession } from '@/stores/store'
import { format } from 'date-fns'

type Phase = 'work' | 'break'

interface FocusTimerProps {
  onClose: () => void
}

const WORK_MIN = 25
const BREAK_MIN = 5

export function FocusTimer({ onClose }: FocusTimerProps) {
  const [phase, setPhase] = useState<Phase>('work')
  const [secondsLeft, setSecondsLeft] = useState(WORK_MIN * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef<string | null>(null)

  const totalSeconds = phase === 'work' ? WORK_MIN * 60 : BREAK_MIN * 60
  const progress = 1 - secondsLeft / totalSeconds
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  const tick = useCallback(() => {
    setSecondsLeft(s => {
      if (s <= 1) {
        // Phase done
        setRunning(false)
        setPhase(p => {
          if (p === 'work') {
            setSessions(n => n + 1)
            if (startedAt.current) {
              addFocusSession({
                started_at: startedAt.current,
                duration_min: WORK_MIN,
                completed: true,
                task_label: 'Focus session',
              })
            }
            return 'break'
          } else {
            return 'work'
          }
        })
        startedAt.current = null
        return phase === 'work' ? BREAK_MIN * 60 : WORK_MIN * 60
      }
      return s - 1
    })
  }, [phase])

  useEffect(() => {
    if (running) {
      if (!startedAt.current) startedAt.current = new Date().toISOString()
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, tick])

  function handleReset() {
    setRunning(false)
    setSecondsLeft(phase === 'work' ? WORK_MIN * 60 : BREAK_MIN * 60)
    startedAt.current = null
  }

  function switchPhase(p: Phase) {
    setRunning(false)
    setPhase(p)
    setSecondsLeft(p === 'work' ? WORK_MIN * 60 : BREAK_MIN * 60)
    startedAt.current = null
  }

  // SVG circle
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - progress)

  if (minimized) {
    return (
      <div
        style={{
          position: 'fixed', bottom: 80, right: 20,
          zIndex: 150,
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: 100,
          padding: '8px 14px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          animation: 'card-enter 0.2s var(--ease-out) both',
        }}
        onClick={() => setMinimized(false)}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: running ? 'var(--accent-green)' : 'var(--text-tertiary)',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{phase === 'work' ? 'Focus' : 'Break'}</span>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', bottom: 80, right: 20,
        zIndex: 150,
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '20px',
        width: 220,
        animation: 'float-up 0.25s var(--ease-out) both',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="label">{phase === 'work' ? 'Focus' : 'Break'}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn-icon" onClick={() => setMinimized(true)} title="Minimize">
            <Minus size={12} />
          </button>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Phase tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
        <button
          onClick={() => switchPhase('work')}
          style={{
            flex: 1, padding: '5px', borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 500,
            border: `1px solid ${phase === 'work' ? 'var(--accent)' : 'var(--border)'}`,
            background: phase === 'work' ? 'var(--accent-green-glass)' : 'var(--surface)',
            color: phase === 'work' ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >Focus</button>
        <button
          onClick={() => switchPhase('break')}
          style={{
            flex: 1, padding: '5px', borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 500,
            border: `1px solid ${phase === 'break' ? 'var(--accent-blue)' : 'var(--border)'}`,
            background: phase === 'break' ? 'var(--accent-blue-glass)' : 'var(--surface)',
            color: phase === 'break' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >Break</button>
      </div>

      {/* Timer circle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <div style={{ position: 'relative', width: 130, height: 130 }}>
          <svg width={130} height={130} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={65} cy={65} r={r}
              fill="none" stroke="var(--border)" strokeWidth={4} />
            {/* Progress */}
            <circle cx={65} cy={65} r={r}
              fill="none"
              stroke={phase === 'work' ? 'var(--accent)' : 'var(--accent-blue)'}
              strokeWidth={4}
              strokeDasharray={`${circ - dash} ${dash}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.5s var(--ease-out)' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 26, fontWeight: 300, letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)',
              lineHeight: 1,
            }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            {sessions > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                {sessions} session{sessions > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <button className="btn-icon" onClick={handleReset} title="Reset">
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => setRunning(r => !r)}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: running ? 'var(--surface-active)' : 'var(--accent)',
            border: `1px solid ${running ? 'var(--border)' : 'transparent'}`,
            color: running ? 'var(--text-primary)' : 'white',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: running ? 'none' : 'var(--shadow-sm)',
            transition: 'all 0.18s var(--ease-out)',
          }}
        >
          {running ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <button
          className="btn-icon"
          onClick={() => switchPhase(phase === 'work' ? 'break' : 'work')}
          title={phase === 'work' ? 'Take a break' : 'Back to focus'}
        >
          <Coffee size={14} />
        </button>
      </div>
    </div>
  )
}
