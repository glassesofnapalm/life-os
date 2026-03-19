import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO, isSameMonth, startOfMonth, eachDayOfInterval, endOfMonth } from 'date-fns'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore, addJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/stores/store'
import type { JournalMood } from '@/types'

const MOODS: { value: JournalMood; emoji: string; label: string }[] = [
  { value: 'amazing',  emoji: '✦', label: 'Amazing' },
  { value: 'good',     emoji: '◆', label: 'Good' },
  { value: 'neutral',  emoji: '●', label: 'Neutral' },
  { value: 'low',      emoji: '▾', label: 'Low' },
  { value: 'difficult',emoji: '◌', label: 'Difficult' },
]

function getMoodColor(mood: JournalMood | null): string {
  switch (mood) {
    case 'amazing':   return 'var(--accent-green)'
    case 'good':      return 'var(--accent-blue)'
    case 'neutral':   return 'var(--text-tertiary)'
    case 'low':       return 'var(--accent-yellow)'
    case 'difficult': return 'var(--accent-red)'
    default:          return 'var(--border)'
  }
}

export default function JournalPage() {
  const entries = useStore(s => s.journalEntries)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [calMonth, setCalMonth] = useState(startOfMonth(new Date()))
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const entry = entries.find(e => e.date === selectedDate)

  // Sync editor when selected entry changes
  useEffect(() => {
    if (titleRef.current)   titleRef.current.value   = entry?.title   ?? ''
    if (contentRef.current) contentRef.current.value = entry?.content ?? ''
  }, [entry?.id, selectedDate])

  const schedSave = useCallback((field: 'title' | 'content', value: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (!entry) return
      updateJournalEntry(entry.id, { [field]: value })
    }, 500)
  }, [entry])

  function handleSelectDate(date: string) {
    setSelectedDate(date)
  }

  function handleNewEntry() {
    const id = addJournalEntry(selectedDate)
    void id
  }

  function handleDelete() {
    if (!entry) return
    if (!confirm('Delete this entry?')) return
    deleteJournalEntry(entry.id)
  }

  // Calendar days for current month
  const calDays = eachDayOfInterval({
    start: startOfMonth(calMonth),
    end: endOfMonth(calMonth),
  })
  const firstDow = startOfMonth(calMonth).getDay() // 0=Sun

  const entryDates = new Set(entries.map(e => e.date))

  return (
    <div className="page-float" style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)', minHeight: 0 }}>

      {/* Sidebar — calendar + entry list */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Mini calendar */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button className="btn-icon" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <ChevronLeft size={13} />
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>
              {format(calMonth, 'MMMM yyyy')}
            </span>
            <button className="btn-icon" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <ChevronRight size={13} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-tertiary)', paddingBottom: 4, textTransform: 'uppercase' }}>
                {d}
              </div>
            ))}
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {calDays.map(d => {
              const ds = format(d, 'yyyy-MM-dd')
              const hasEntry = entryDates.has(ds)
              const isSelected = ds === selectedDate
              const isToday = ds === today
              return (
                <button
                  key={ds}
                  onClick={() => handleSelectDate(ds)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)',
                    fontSize: 11, fontWeight: isToday ? 600 : 400,
                    border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                    background: isSelected ? 'var(--accent-green-glass)' : 'transparent',
                    color: isToday ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s',
                  }}
                >
                  {format(d, 'd')}
                  {hasEntry && !isSelected && (
                    <span style={{
                      position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                      width: 3, height: 3, borderRadius: '50%',
                      background: 'var(--accent)',
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent entries list */}
        <div className="glass-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <span className="label">Entries</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            {entries.length === 0 && (
              <p className="body-xs" style={{ padding: '12px', textAlign: 'center' }}>No entries yet</p>
            )}
            {[...entries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(e => (
                <button
                  key={e.id}
                  onClick={() => { handleSelectDate(e.date); setCalMonth(startOfMonth(parseISO(e.date))) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: e.date === selectedDate ? 'var(--surface-active)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    transition: 'background 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {e.mood && (
                      <span style={{ fontSize: 10, color: getMoodColor(e.mood) }}>
                        {MOODS.find(m => m.value === e.mood)?.emoji}
                      </span>
                    )}
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {format(parseISO(e.date), 'MMM d')}
                    </span>
                  </div>
                  {e.title ? (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Untitled</span>
                  )}
                </button>
              ))
            }
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Editor header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>
              {selectedDate === today
                ? `Today · ${format(new Date(), 'EEEE, MMMM d')}`
                : format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Mood selector */}
          {entry && (
            <div style={{ display: 'flex', gap: 4 }}>
              {MOODS.map(m => (
                <button
                  key={m.value}
                  title={m.label}
                  onClick={() => updateJournalEntry(entry.id, { mood: entry.mood === m.value ? null : m.value })}
                  style={{
                    width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${entry.mood === m.value ? getMoodColor(m.value) : 'var(--border)'}`,
                    background: entry.mood === m.value ? `${getMoodColor(m.value)}22` : 'transparent',
                    cursor: 'pointer', fontSize: 12, color: getMoodColor(m.value),
                    transition: 'all 0.12s',
                  }}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          )}

          {entry ? (
            <button className="btn-icon" onClick={handleDelete} title="Delete entry">
              <Trash2 size={13} />
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleNewEntry}>
              <Plus size={13} /> New entry
            </button>
          )}
        </div>

        {/* Editor body */}
        {entry ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <input
              ref={titleRef}
              defaultValue={entry.title}
              placeholder="Entry title…"
              onChange={e => schedSave('title', e.target.value)}
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                padding: '16px 24px 8px',
                fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em',
                color: 'var(--text-primary)', width: '100%', fontFamily: 'inherit',
              }}
            />
            <textarea
              ref={contentRef}
              defaultValue={entry.content}
              placeholder="Write your thoughts…"
              onChange={e => schedSave('content', e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                padding: '8px 24px 24px',
                fontSize: 14.5, lineHeight: 1.75,
                color: 'var(--text-primary)', width: '100%', fontFamily: 'inherit',
                resize: 'none',
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
            <p className="body-sm" style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
              No entry for {selectedDate === today ? 'today' : format(parseISO(selectedDate), 'MMM d')}.
            </p>
            <button className="btn btn-primary btn-sm" onClick={handleNewEntry}>
              <Plus size={13} /> Write today's entry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
