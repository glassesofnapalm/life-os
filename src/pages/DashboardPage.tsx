import { useState, useEffect, useRef, useCallback } from 'react'
import { format, differenceInDays, parseISO, isTomorrow, isToday } from 'date-fns'
import {
  CheckCircle2, Circle, Calendar, Target, Sparkles, Clock,
  Music, BookOpen, Cloud, MapPin, Wind, Droplets,
  Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  TrendingUp, ListChecks,
} from 'lucide-react'
import { useStore, useActions } from '@/stores/store'
import type { Task, Goal, LifeEvent, CalendarEvent, Book as BookType, BookStatus } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import {
  isSpotifyConnected, initiateSpotifyAuth,
  clearSpotifyAuth, getCurrentlyPlaying, getRecentlyPlayed,
  getSpotifyClientId,
  type SpotifyTrack,
} from '@/lib/spotify'

/* ── Helpers ─────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function weatherDescription(code: number): { label: string; emoji: string } {
  if (code === 0)  return { label: 'Clear sky',     emoji: '☀️' }
  if (code <= 2)   return { label: 'Partly cloudy', emoji: '⛅' }
  if (code === 3)  return { label: 'Overcast',      emoji: '☁️' }
  if (code <= 49)  return { label: 'Foggy',         emoji: '🌫️' }
  if (code <= 57)  return { label: 'Drizzle',       emoji: '🌦️' }
  if (code <= 67)  return { label: 'Rain',          emoji: '🌧️' }
  if (code <= 77)  return { label: 'Snow',          emoji: '❄️' }
  if (code <= 82)  return { label: 'Rain showers',  emoji: '🌧️' }
  if (code <= 86)  return { label: 'Snow showers',  emoji: '🌨️' }
  if (code <= 99)  return { label: 'Thunderstorm',  emoji: '⛈️' }
  return { label: 'Unknown', emoji: '🌡️' }
}

/* ── Dash card wrapper ───────────────────────────────────────── */
function DashCard({
  gridArea, title, icon, children, accent,
}: {
  gridArea: string
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  accent?: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="glass-card" style={{ gridArea, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '12px 16px',
        borderBottom: collapsed ? 'none' : '1px solid var(--glass-border)',
        flexShrink: 0,
        cursor: 'pointer',
        userSelect: 'none',
      }} onClick={() => setCollapsed(c => !c)}>
        <span style={{ color: accent || 'var(--accent-blue)', display: 'flex', alignItems: 'center' }}>{icon}</span>
        <span className="heading-sm" style={{ flex: 1 }}>{title}</span>
        {collapsed
          ? <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          : <ChevronDown size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
      </div>
      {!collapsed && (
        <div style={{ padding: '14px 16px', flex: 1 }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Weather card ────────────────────────────────────────────── */
interface WeatherData {
  temp: number; feelsLike: number; humidity: number; windspeed: number; code: number; city?: string
}

function WeatherCard() {
  const [data, setData]     = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true); setError(null)
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m` +
        `&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error('Weather fetch failed')
      const json = await resp.json()
      const c = json.current
      let city: string | undefined
      try {
        const g = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'Accept-Language': 'en' } })
        if (g.ok) {
          const gj = await g.json()
          city = gj.address?.city || gj.address?.town || gj.address?.village
        }
      } catch { /* ignore */ }
      setData({ temp: Math.round(c.temperature_2m), feelsLike: Math.round(c.apparent_temperature), humidity: c.relativehumidity_2m, windspeed: Math.round(c.windspeed_10m), code: c.weathercode, city })
    } catch (e: any) { setError(e.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      p => fetchWeather(p.coords.latitude, p.coords.longitude),
      () => setError('Allow location access to see weather'),
      { timeout: 8000 }
    )
  }, [fetchWeather])

  const inner = (() => {
    if (loading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    )
    if (error) return (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <Cloud size={24} style={{ color: 'var(--text-tertiary)', margin: '0 auto 6px' }} />
        <p className="body-xs" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
      </div>
    )
    if (!data) return null
    const { label, emoji } = weatherDescription(data.code)
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            {data.city && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <MapPin size={11} style={{ color: 'var(--text-tertiary)' }} />
                <span className="body-xs">{data.city}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text-primary)', lineHeight: 1 }}>{data.temp}</span>
              <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1 }}>°C</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{label}</p>
          </div>
          <span style={{ fontSize: 44, lineHeight: 1, marginTop: 4 }}>{emoji}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Cloud size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="body-xs">Feels {data.feelsLike}°</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Droplets size={12} style={{ color: 'var(--accent-blue)' }} />
            <span className="body-xs">{data.humidity}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wind size={12} style={{ color: 'var(--text-tertiary)' }} />
            <span className="body-xs">{data.windspeed} km/h</span>
          </div>
        </div>
      </div>
    )
  })()

  return (
    <DashCard gridArea="weather" title="Weather" icon={<Cloud size={15} />} accent="var(--accent-blue)">
      {inner}
    </DashCard>
  )
}

/* ── Spotify card ────────────────────────────────────────────── */
function SpotifyCard() {
  const [connected, setConnected]     = useState(isSpotifyConnected)
  const [hasClientId, setHasClientId] = useState(() => !!getSpotifyClientId())
  const [current, setCurrent]         = useState<SpotifyTrack | null>(null)
  const [recent, setRecent]           = useState<SpotifyTrack[]>([])
  const [loading, setLoading]         = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    if (!isSpotifyConnected()) { setConnected(false); return }
    setLoading(true)
    try {
      const [cur, rec] = await Promise.all([getCurrentlyPlaying(), getRecentlyPlayed(3)])
      setCurrent(cur); setRecent(rec)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!connected) return
    load()
    pollRef.current = setInterval(load, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [connected, load])

  const inner = (() => {
    if (!hasClientId) return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Music size={24} style={{ color: '#1DB954', margin: '0 auto 8px', opacity: 0.7 }} />
        <p className="body-sm" style={{ marginBottom: 6 }}>Set up Spotify in Settings</p>
        <a href="/settings" className="body-xs" style={{ color: 'var(--accent-blue)' }}>Open Settings →</a>
      </div>
    )
    if (!connected) return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Music size={24} style={{ color: '#1DB954', margin: '0 auto 8px', opacity: 0.7 }} />
        <p className="body-sm" style={{ marginBottom: 12 }}>Connect your Spotify account</p>
        <button
          className="btn-primary"
          onClick={() => initiateSpotifyAuth().catch(() => {})}
          style={{ background: '#1DB954', borderColor: '#1DB954', fontSize: 13 }}
        >
          Connect Spotify
        </button>
      </div>
    )
    const track = current ?? recent[0] ?? null
    return (
      <div>
        {track ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            {track.albumArt && (
              <img src={track.albumArt} alt={track.album}
                style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
            )}
            <div style={{ minWidth: 0 }}>
              {current?.isPlaying && (
                <p style={{ fontSize: 10, fontWeight: 700, color: '#1DB954', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  ▶ Now Playing
                </p>
              )}
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {track.name}
              </p>
              <p className="body-xs">{track.artists}</p>
              {current?.isPlaying && current.progressMs !== undefined && current.durationMs && (
                <div style={{ marginTop: 8, background: 'var(--glass-border)', borderRadius: 2, height: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#1DB954', borderRadius: 2,
                    width: `${Math.round((current.progressMs / current.durationMs) * 100)}%`,
                    transition: 'width 1s linear',
                  }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="body-sm" style={{ marginBottom: 12, color: 'var(--text-tertiary)' }}>Nothing playing right now.</p>
        )}

        {recent.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.slice(track && current ? 0 : 1, 3).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {t.albumArt && (
                  <img src={t.albumArt} alt="" style={{ width: 30, height: 30, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                  <p className="body-xs">{t.artists}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => { clearSpotifyAuth(); setConnected(false); setCurrent(null); setRecent([]) }}
          style={{ marginTop: 14, fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Disconnect
        </button>
      </div>
    )
  })()

  return (
    <DashCard gridArea="spotify" title="Now Playing" icon={<Music size={15} />} accent="#1DB954">
      {inner}
    </DashCard>
  )
}

/* ── Quick stats card ────────────────────────────────────────── */
function QuickStatsCard({ tasks, goals, events, books }: {
  tasks: Task[]; goals: Goal[]; events: CalendarEvent[]; books: BookType[]
}) {
  const todayCount  = tasks.filter(t => t.status === 'today').length
  const activeGoals = goals.length
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0
  const nextEvent   = events
    .filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
  const daysUntil   = nextEvent ? differenceInDays(new Date(nextEvent.start), new Date()) : null
  const readingCount = books.filter(b => b.status === 'reading').length

  const tiles = [
    { value: todayCount, label: 'Tasks today', icon: <ListChecks size={14} />, accent: 'var(--accent-blue)' },
    { value: `${avgProgress}%`, label: 'Goals avg', icon: <Target size={14} />, accent: 'var(--accent-purple)' },
    { value: daysUntil !== null ? (daysUntil === 0 ? 'Today' : `${daysUntil}d`) : '—', label: 'Next event', icon: <Calendar size={14} />, accent: 'var(--accent-green)' },
    { value: readingCount, label: 'Reading', icon: <BookOpen size={14} />, accent: 'var(--accent-orange)' },
  ]

  return (
    <DashCard gridArea="stats" title="Overview" icon={<TrendingUp size={15} />} accent="var(--accent-purple)">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {tiles.map(t => (
          <div key={t.label} className="stat-tile">
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: t.accent }}>{t.icon}</div>
            <span className="stat-tile-value" style={{ color: t.accent }}>{t.value}</span>
            <span className="stat-tile-label">{t.label}</span>
          </div>
        ))}
      </div>
    </DashCard>
  )
}

/* ── Tasks today card ────────────────────────────────────────── */
function TasksTodayCard({ tasks }: { tasks: Task[] }) {
  const { updateTask } = useActions()
  const today = tasks.filter(t => t.status === 'today')

  return (
    <DashCard gridArea="tasks" title="Today's Tasks" icon={<ListChecks size={15} />} accent="var(--accent-green)">
      {!today.length ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={28} style={{ color: 'var(--accent-green)', margin: '0 auto 8px', opacity: 0.6 }} />
          <p className="body-sm">All clear for today.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {today.map(task => (
            <div key={task.id} className="task-row" onClick={() => updateTask(task.id, { status: 'done' })}>
              <Circle size={14} style={{ color: 'var(--glass-border-strong)', flexShrink: 0 }} />
              <div className={`priority-dot priority-${task.priority}`} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </DashCard>
  )
}

/* ── Calendar upcoming card ──────────────────────────────────── */
function CalendarCard({ events }: { events: CalendarEvent[] }) {
  const upcoming = events
    .filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5)

  return (
    <DashCard gridArea="calendar" title="Upcoming Events" icon={<Calendar size={15} />} accent="var(--accent-blue)">
      {!upcoming.length ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Calendar size={28} style={{ color: 'var(--accent-blue)', margin: '0 auto 8px', opacity: 0.5 }} />
          <p className="body-sm">No upcoming events.</p>
          <a href="/settings" className="body-xs" style={{ color: 'var(--accent-blue)' }}>Connect a calendar →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upcoming.map(event => {
            const start = new Date(event.start)
            const dayLabel = isToday(start) ? 'Today' : isTomorrow(start) ? 'Tomorrow' : format(start, 'EEE d MMM')
            const sourceColor = event.source === 'outlook' ? 'var(--accent-blue)' : event.source === 'icloud' ? 'var(--accent-green)' : 'var(--accent-purple)'
            return (
              <div key={event.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 4, height: 36, borderRadius: 2, background: sourceColor, flexShrink: 0,
                }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.title}
                  </p>
                  <p className="body-xs">
                    {dayLabel}{!event.allDay && ` · ${format(start, 'h:mm a')}`}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashCard>
  )
}

/* ── Goals card ──────────────────────────────────────────────── */
const catColor: Record<string, 'green' | 'blue' | 'orange' | 'purple' | 'pink' | 'red'> = {
  Health: 'green', Finance: 'blue', Career: 'orange',
  Learning: 'purple', Personal: 'pink', Relationships: 'red',
}

function GoalsCard({ goals }: { goals: Goal[] }) {
  return (
    <DashCard gridArea="goals" title="Goals Progress" icon={<Target size={15} />} accent="var(--accent-purple)">
      {!goals.length ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Target size={28} style={{ color: 'var(--accent-purple)', margin: '0 auto 8px', opacity: 0.5 }} />
          <p className="body-sm">No goals yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {goals.slice(0, 4).map(goal => {
            const daysLeft = goal.target_date ? differenceInDays(parseISO(goal.target_date), new Date()) : null
            const col = catColor[goal.category] || 'blue'
            return (
              <div key={goal.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {goal.title}
                    </span>
                    <Badge color={col}>{goal.category}</Badge>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)', marginLeft: 8, flexShrink: 0 }}>{goal.progress}%</span>
                </div>
                <ProgressBar value={goal.progress} color={col} />
                {daysLeft !== null && (
                  <p className="body-xs" style={{ marginTop: 3 }}>
                    {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </DashCard>
  )
}

/* ── Books card ──────────────────────────────────────────────── */
const STATUS_LABELS: Record<BookStatus, string> = {
  reading: 'Reading', finished: 'Finished', 'want-to-read': 'Want to read'
}
const STATUS_COLORS: Record<BookStatus, 'green' | 'blue' | 'default'> = {
  reading: 'green', finished: 'blue', 'want-to-read': 'default'
}

function BooksCard() {
  const books = useStore(s => s.books)
  const { addBook, updateBook, deleteBook } = useActions()
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [form, setForm]       = useState({ title: '', author: '', status: 'reading' as BookStatus, progress: 0 })

  function resetForm() { setForm({ title: '', author: '', status: 'reading', progress: 0 }); setShowAdd(false); setEditId(null) }
  function handleSubmit() {
    if (!form.title.trim()) return
    if (editId) updateBook(editId, form)
    else addBook(form)
    resetForm()
  }
  function startEdit(b: BookType) { setForm({ title: b.title, author: b.author, status: b.status, progress: b.progress }); setEditId(b.id); setShowAdd(true) }

  return (
    <DashCard gridArea="books" title="Reading List" icon={<BookOpen size={15} />} accent="var(--accent-orange)">
      {books.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: showAdd ? 12 : 0 }}>
          {books.map(b => (
            <div key={b.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{b.title}</span>
                  <Badge color={STATUS_COLORS[b.status]}>{STATUS_LABELS[b.status]}</Badge>
                </div>
                {b.author && <p className="body-xs">{b.author}</p>}
                {b.status === 'reading' && (
                  <div style={{ marginTop: 5 }}>
                    <ProgressBar value={b.progress} color="orange" />
                    <p className="body-xs" style={{ marginTop: 2 }}>{b.progress}%</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <button className="btn-icon" onClick={() => startEdit(b)}><Pencil size={12} /></button>
                <button className="btn-icon" onClick={() => deleteBook(b.id)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input className="input" placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus style={{ fontSize: 13 }} />
          <input className="input" placeholder="Author" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} style={{ fontSize: 13 }} />
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as BookStatus }))} style={{ fontSize: 13 }}>
            <option value="reading">Reading</option>
            <option value="want-to-read">Want to read</option>
            <option value="finished">Finished</option>
          </select>
          {form.status === 'reading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min={0} max={100} step={5} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) }))} style={{ flex: 1 }} />
              <span className="body-xs" style={{ minWidth: 30 }}>{form.progress}%</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={handleSubmit}>{editId ? 'Save' : 'Add'}</button>
            <button className="btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={resetForm}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost" onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginTop: books.length ? 10 : 0 }}>
          <Plus size={13} /> Add book
        </button>
      )}
    </DashCard>
  )
}

/* ── Milestones card ─────────────────────────────────────────── */
const moodEmoji: Record<string, string> = {
  amazing: '🌟', good: '😊', neutral: '😐', tough: '😕', difficult: '😔'
}

function MilestonesCard({ events }: { events: LifeEvent[] }) {
  return (
    <DashCard gridArea="milestones" title="Recent Milestones" icon={<Sparkles size={15} />} accent="var(--accent-yellow)">
      {!events.length ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Sparkles size={28} style={{ color: 'var(--accent-yellow)', margin: '0 auto 8px', opacity: 0.5 }} />
          <p className="body-sm">Log your first life milestone.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {events.slice(0, 4).map(event => (
            <div key={event.id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              flex: '1 1 200px', minWidth: 180,
              background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{moodEmoji[event.mood]}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{event.title}</p>
                <p className="body-xs">{format(parseISO(event.date), 'MMM d, yyyy')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashCard>
  )
}

/* ── Dashboard page ──────────────────────────────────────────── */
export default function DashboardPage() {
  const tasks          = useStore(s => s.tasks)
  const goals          = useStore(s => s.goals)
  const lifeEvents     = useStore(s => s.lifeEvents)
  const calendarEvents = useStore(s => s.calendarEvents)
  const books          = useStore(s => s.books)

  const todayCount = tasks.filter(t => t.status === 'today').length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 className="heading-xl">{getGreeting()}</h1>
          <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="body-sm" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
          {todayCount > 0 && (
            <span style={{ marginLeft: 12, color: 'var(--accent-blue)', fontWeight: 500 }}>
              {todayCount} task{todayCount !== 1 ? 's' : ''} to do
            </span>
          )}
        </p>
      </div>

      {/* Bento grid */}
      <div className="dash-grid">
        <WeatherCard />
        <SpotifyCard />
        <QuickStatsCard tasks={tasks} goals={goals} events={calendarEvents} books={books} />
        <TasksTodayCard tasks={tasks} />
        <CalendarCard events={calendarEvents} />
        <GoalsCard goals={goals} />
        <BooksCard />
        <MilestonesCard events={lifeEvents} />
      </div>
    </div>
  )
}
