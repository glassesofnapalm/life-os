import { useState, useMemo } from 'react'
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns'
import { Plus, Flame, Check, Archive, Pencil, Trash2, X } from 'lucide-react'
import { useStore, addHabit, updateHabit, deleteHabit, toggleHabitLog } from '@/stores/store'
import type { Habit, HabitFrequency } from '@/types'

const ICONS = ['✦', '◆', '●', '▲', '✿', '☀', '♥', '⚡', '⬟', '◉', '⬡', '★']
const COLORS = ['green', 'blue', 'purple', 'orange', 'red', 'yellow', 'teal', 'pink']
const FREQ_LABELS: Record<HabitFrequency, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Once a week',
}

function habitAppliesOnDate(habit: Habit, dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() // 0=Sun
  if (habit.frequency === 'daily') return true
  if (habit.frequency === 'weekdays') return day >= 1 && day <= 5
  if (habit.frequency === 'weekends') return day === 0 || day === 6
  if (habit.frequency === 'weekly') return day === 1
  return true
}

interface HabitFormProps {
  initial?: Partial<Habit>
  onSave: (data: { name: string; icon: string; color: string; frequency: HabitFrequency }) => void
  onCancel: () => void
}

function HabitForm({ initial, onSave, onCancel }: HabitFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '✦')
  const [color, setColor] = useState(initial?.color ?? 'green')
  const [freq, setFreq] = useState<HabitFrequency>(initial?.frequency ?? 'daily')

  return (
    <div style={{
      background: 'var(--surface-raised)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      boxShadow: 'var(--shadow-md)',
      animation: 'card-enter 0.25s var(--ease-out) both',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="heading-sm">{initial?.id ? 'Edit habit' : 'New habit'}</span>
        <button className="btn-icon" onClick={onCancel}><X size={14} /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          className="input"
          placeholder="Habit name…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <div>
          <p className="form-label">Icon</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ICONS.map(ic => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${ic === icon ? 'var(--accent)' : 'var(--border)'}`,
                  background: ic === icon ? 'var(--accent-green-glass)' : 'var(--surface)',
                  cursor: 'pointer', fontSize: 16,
                }}
              >{ic}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="form-label">Color</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `var(--accent-${c})`,
                  border: c === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  outline: c === color ? '2px solid var(--surface)' : 'none',
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="form-label">Frequency</p>
          <div className="tab-bar" style={{ width: 'fit-content' }}>
            {(Object.entries(FREQ_LABELS) as [HabitFrequency, string][]).map(([k, v]) => (
              <button key={k} className={`tab${freq === k ? ' active' : ''}`} onClick={() => setFreq(k)}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!name.trim()}
            onClick={() => onSave({ name: name.trim(), icon, color, frequency: freq })}
          >
            {initial?.id ? 'Save' : 'Add habit'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HabitTrackerPage() {
  const allHabits = useStore(s => s.habits)
  const habitLogs = useStore(s => s.habitLogs)
  const habits = allHabits.filter(h => !h.archived)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')

  // Last 10 weeks of dates for heatmap
  const heatmapDays = useMemo(() =>
    eachDayOfInterval({ start: subDays(new Date(), 69), end: new Date() })
      .map(d => format(d, 'yyyy-MM-dd')),
    []
  )

  // Last 7 days for the daily check-in row
  const weekDays = useMemo(() =>
    eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() })
      .map(d => format(d, 'yyyy-MM-dd')),
    []
  )

  function isCompleted(habit_id: string, date: string) {
    return habitLogs.some(l => l.habit_id === habit_id && l.date === date && l.completed)
  }

  function getStreak(habit: Habit) {
    let streak = 0
    let d = startOfDay(new Date())
    while (true) {
      const dateStr = format(d, 'yyyy-MM-dd')
      if (!habitAppliesOnDate(habit, dateStr)) { d = subDays(d, 1); continue }
      if (!isCompleted(habit.id, dateStr)) break
      streak++
      d = subDays(d, 1)
    }
    return streak
  }

  function getTotalForDay(date: string) {
    return habits.filter(h =>
      habitAppliesOnDate(h, date) && isCompleted(h.id, date)
    ).length
  }

  function getTotalApplicableForDay(date: string) {
    return habits.filter(h => habitAppliesOnDate(h, date)).length
  }

  return (
    <div className="page-float" style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-greeting">
        <p className="page-greeting-time">Habit Tracker</p>
        <h1 className="page-greeting-title">Build your routines</h1>
      </div>

      {/* Add form */}
      {showForm && !editingId && (
        <div style={{ marginBottom: 20 }}>
          <HabitForm
            onSave={data => {
              addHabit(data.name, data.icon, data.color, data.frequency)
              setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Today's check-in */}
      {habits.length > 0 && (
        <div className="glass-card" style={{ marginBottom: 12 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="heading-sm">Today</span>
              <span className="body-xs">
                {getTotalForDay(today)} / {getTotalApplicableForDay(today)} done
              </span>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {habits.map(habit => {
              const applies = habitAppliesOnDate(habit, today)
              const done = isCompleted(habit.id, today)
              const streak = getStreak(habit)
              return (
                <div
                  key={habit.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 10px',
                    borderRadius: 'var(--radius-md)',
                    opacity: applies ? 1 : 0.35,
                    background: done ? `var(--accent-${habit.color}-glass, var(--accent-green-glass))` : 'transparent',
                    transition: 'all 0.2s var(--ease-out)',
                  }}
                >
                  <button
                    onClick={() => applies && toggleHabitLog(habit.id, today)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      border: `1.5px solid ${done ? `var(--accent-${habit.color}, var(--accent-green))` : 'var(--border-strong)'}`,
                      background: done ? `var(--accent-${habit.color}, var(--accent-green))` : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: applies ? 'pointer' : 'default',
                      flexShrink: 0,
                      transition: 'all 0.18s var(--ease-out)',
                    }}
                  >
                    {done && <Check size={13} color="white" strokeWidth={2.5} />}
                  </button>
                  <span style={{ fontSize: 17, lineHeight: 1 }}>{habit.icon}</span>
                  <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-primary)', fontWeight: done ? 500 : 400 }}>
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: 'var(--accent-orange)' }}>
                      <Flame size={12} />
                      {streak}
                    </span>
                  )}
                  {!applies && (
                    <span className="body-xs">{FREQ_LABELS[habit.frequency]}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Weekly view */}
      {habits.length > 0 && (
        <div className="glass-card" style={{ marginBottom: 12 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span className="heading-sm">This week</span>
          </div>
          <div style={{ padding: '12px 16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 180, textAlign: 'left', paddingBottom: 8 }} />
                  {weekDays.map(d => (
                    <th key={d} style={{ textAlign: 'center', paddingBottom: 8, minWidth: 36 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span className="label">{format(new Date(d + 'T12:00:00'), 'EEE')}</span>
                        <span style={{
                          fontSize: 11, fontWeight: d === today ? 600 : 400,
                          color: d === today ? 'var(--accent)' : 'var(--text-tertiary)',
                        }}>
                          {format(new Date(d + 'T12:00:00'), 'd')}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => (
                  <tr key={habit.id}>
                    <td style={{ paddingBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 14 }}>{habit.icon}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                          {habit.name}
                        </span>
                      </div>
                    </td>
                    {weekDays.map(d => {
                      const applies = habitAppliesOnDate(habit, d)
                      const done = isCompleted(habit.id, d)
                      return (
                        <td key={d} style={{ textAlign: 'center', paddingBottom: 6 }}>
                          {applies ? (
                            <button
                              onClick={() => toggleHabitLog(habit.id, d)}
                              style={{
                                width: 24, height: 24, borderRadius: '50%',
                                border: `1.5px solid ${done ? `var(--accent-${habit.color}, var(--accent-green))` : 'var(--border)'}`,
                                background: done ? `var(--accent-${habit.color}, var(--accent-green))` : 'transparent',
                                cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                            >
                              {done && <Check size={11} color="white" strokeWidth={3} />}
                            </button>
                          ) : (
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--border)' }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Habit management list */}
      <div className="glass-card" style={{ marginBottom: 12 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="heading-sm">Habits</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(true); setEditingId(null) }}>
            <Plus size={13} /> Add
          </button>
        </div>
        <div style={{ padding: '8px 12px' }}>
          {habits.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p className="body-sm" style={{ marginBottom: 12 }}>No habits yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                <Plus size={13} /> Add your first habit
              </button>
            </div>
          )}
          {habits.map(habit => (
            <div key={habit.id}>
              {editingId === habit.id ? (
                <div style={{ marginBottom: 6 }}>
                  <HabitForm
                    initial={habit}
                    onSave={data => {
                      updateHabit(habit.id, data)
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div
                  className="task-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 16 }}>{habit.icon}</span>
                  <div
                    style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--accent-${habit.color}, var(--accent-green))`, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-primary)' }}>{habit.name}</span>
                  <span className="body-xs">{FREQ_LABELS[habit.frequency]}</span>
                  <button className="btn-icon" onClick={() => setEditingId(habit.id)} title="Edit">
                    <Pencil size={12} />
                  </button>
                  <button className="btn-icon" onClick={() => updateHabit(habit.id, { archived: true })} title="Archive">
                    <Archive size={12} />
                  </button>
                  <button className="btn-icon" onClick={() => deleteHabit(habit.id)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
