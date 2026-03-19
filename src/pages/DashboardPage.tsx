import { useState, useEffect, useRef, useCallback } from 'react'
import { format, differenceInDays, parseISO, isTomorrow, isToday, startOfWeek, addDays } from 'date-fns'
import {
  CheckCircle2, Circle, Calendar, Target, Sparkles, Clock,
  Music, BookOpen, Cloud, MapPin, Wind, Droplets,
  Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  TrendingUp, ListChecks, GripVertical, X, Settings2,
  SkipBack, SkipForward, Play, Pause, Search, Check,
  ChefHat, Loader2, UtensilsCrossed,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore, useActions, reorderWidgets, toggleWidgetVisible, toggleWidgetCollapsed, addWidget, addWeatherCity, removeWeatherCity, updateMealPlan, setMealDay } from '@/stores/store'
import type { Task, Goal, LifeEvent, CalendarEvent, Book as BookType, BookStatus, Widget, WidgetType, WeatherCity, MealDay } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import {
  isSpotifyConnected, initiateSpotifyAuth, clearSpotifyAuth,
  getCurrentlyPlaying, getRecentlyPlayed, getSpotifyClientId,
  spotifyPlay, spotifyPause, spotifyNext, spotifyPrev,
  type SpotifyTrack,
} from '@/lib/spotify'
import { isClaudeConfigured, generateMealPlan } from '@/lib/claude'

/* ── Helpers ──────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function weatherDesc(code: number): { label: string; emoji: string } {
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

const WIDGET_TITLES: Record<WidgetType, string> = {
  'weather':            'Weather',
  'spotify':            'Now Playing',
  'tasks-today':        "Today's Tasks",
  'calendar-upcoming':  'Upcoming Events',
  'goals-progress':     'Goals Progress',
  'books':              'Reading List',
  'life-events-recent': 'Recent Milestones',
  'recipes':            'Meal Planner',
  'stats':              'Overview',
}

const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  'weather':            <Cloud size={15} />,
  'spotify':            <Music size={15} />,
  'tasks-today':        <ListChecks size={15} />,
  'calendar-upcoming':  <Calendar size={15} />,
  'goals-progress':     <Target size={15} />,
  'books':              <BookOpen size={15} />,
  'life-events-recent': <Sparkles size={15} />,
  'recipes':            <ChefHat size={15} />,
  'stats':              <TrendingUp size={15} />,
}

const WIDGET_ACCENTS: Record<WidgetType, string> = {
  'weather':            'var(--accent-blue)',
  'spotify':            '#1DB954',
  'tasks-today':        'var(--accent-green)',
  'calendar-upcoming':  'var(--accent-blue)',
  'goals-progress':     'var(--accent-purple)',
  'books':              'var(--accent-orange)',
  'life-events-recent': 'var(--accent-yellow)',
  'recipes':            'var(--accent-pink)',
  'stats':              'var(--accent-purple)',
}

/* ── DashCard wrapper ─────────────────────────────────────────── */
function DashCard({
  widget, title, icon, accent, children, editMode, dragListeners,
}: {
  widget: Widget
  title: string
  icon: React.ReactNode
  accent?: string
  children: React.ReactNode
  editMode: boolean
  dragListeners?: Record<string, unknown>
}) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '11px 14px',
        borderBottom: widget.collapsed ? 'none' : '1px solid var(--glass-border)',
        flexShrink: 0,
      }}>
        {editMode && (
          <span
            {...dragListeners}
            className="dash-drag-handle"
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </span>
        )}
        <span style={{ color: accent || 'var(--accent-blue)', display: 'flex', flexShrink: 0 }}>{icon}</span>
        <span className="heading-sm" style={{ flex: 1, cursor: editMode ? 'default' : 'pointer' }}
          onClick={() => !editMode && toggleWidgetCollapsed(widget.id)}>
          {title}
        </span>
        {!editMode && (
          <button
            onClick={() => toggleWidgetCollapsed(widget.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 2, borderRadius: 4 }}
          >
            {widget.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
        {editMode && (
          <button
            onClick={() => toggleWidgetVisible(widget.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 2, borderRadius: 4 }}
            title="Hide widget"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {!widget.collapsed && (
        <div style={{ padding: '14px 16px', flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Sortable item wrapper ────────────────────────────────────── */
function SortableItem({
  id, editMode, children,
}: {
  id: string
  editMode: boolean
  children: (listeners: Record<string, unknown>) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity:   isDragging ? 0.45 : 1,
        zIndex:    isDragging ? 999 : undefined,
        position:  'relative',
      }}
      {...attributes}
    >
      {children(listeners as Record<string, unknown>)}
    </div>
  )
}

/* ── Widget Picker modal ──────────────────────────────────────── */
function WidgetPicker({ onClose }: { onClose: () => void }) {
  const widgets = useStore(s => s.widgets)
  const allTypes: WidgetType[] = ['weather', 'spotify', 'tasks-today', 'calendar-upcoming', 'goals-progress', 'books', 'life-events-recent', 'stats', 'recipes']

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-strong" style={{ borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="heading-md">Add Widgets</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allTypes.map(type => {
            const w = widgets.find(x => x.type === type)
            const isVisible = w?.visible ?? false
            return (
              <div key={type} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)',
              }}>
                <span style={{ color: WIDGET_ACCENTS[type], display: 'flex', flexShrink: 0 }}>
                  {WIDGET_ICONS[type]}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {WIDGET_TITLES[type]}
                </span>
                <button
                  onClick={() => {
                    if (isVisible) toggleWidgetVisible(w!.id)
                    else addWidget(type)
                  }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                    border: isVisible ? '1px solid var(--accent-green)' : '1px solid var(--glass-border)',
                    background: isVisible ? 'var(--accent-green-glass)' : 'var(--glass-bg)',
                    color: isVisible ? 'var(--accent-green)' : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isVisible ? <><Check size={10} /> Shown</> : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Weather widget ───────────────────────────────────────────── */
interface WeatherData {
  temp: number; feelsLike: number; humidity: number; windspeed: number; code: number; city: string
}

function WeatherContent() {
  const cities = useStore(s => s.weatherCities)
  const [activeId, setActiveId] = useState<string | null>(null) // null = geolocation
  const [data, setData]         = useState<WeatherData | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<WeatherCity[]>([])
  const [searching, setSearching] = useState(false)

  const fetchWeather = useCallback(async (lat: number, lon: number, cityName: string) => {
    setLoading(true); setError(null)
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m` +
        `&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error('Weather fetch failed')
      const json = await resp.json()
      const c = json.current
      setData({ temp: Math.round(c.temperature_2m), feelsLike: Math.round(c.apparent_temperature), humidity: c.relativehumidity_2m, windspeed: Math.round(c.windspeed_10m), code: c.weathercode, city: cityName })
    } catch (e: any) { setError(e.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [])

  // Fetch for active selection
  useEffect(() => {
    if (activeId) {
      const city = cities.find(c => c.id === activeId)
      if (city) fetchWeather(city.lat, city.lon, `${city.name}, ${city.country}`)
    } else {
      if (!navigator.geolocation) { setError('Geolocation not supported'); return }
      navigator.geolocation.getCurrentPosition(
        async p => {
          let cityName = 'My Location'
          try {
            const g = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p.coords.latitude}&lon=${p.coords.longitude}&format=json`, { headers: { 'Accept-Language': 'en' } })
            if (g.ok) { const gj = await g.json(); cityName = gj.address?.city || gj.address?.town || gj.address?.village || cityName }
          } catch { /* ignore */ }
          fetchWeather(p.coords.latitude, p.coords.longitude, cityName)
        },
        () => setError('Allow location access to see weather'),
        { timeout: 8000 }
      )
    }
  }, [activeId, cities, fetchWeather])

  const searchCities = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`)
      const json = await resp.json()
      setResults((json.results ?? []).map((r: any) => ({
        id: String(r.id), name: r.name, country: r.country_code?.toUpperCase() ?? '', lat: r.latitude, lon: r.longitude,
      })))
    } catch { setResults([]) }
    finally { setSearching(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchCities(query), 400)
    return () => clearTimeout(t)
  }, [query, searchCities])

  return (
    <div>
      {/* City tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveId(null)}
          style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
            border: `1px solid ${activeId === null ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
            background: activeId === null ? 'var(--accent-blue-glass)' : 'var(--glass-bg)',
            color: activeId === null ? 'var(--accent-blue)' : 'var(--text-secondary)',
          }}
        >
          My Location
        </button>
        {cities.map(city => (
          <div key={city.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={() => setActiveId(city.id)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${activeId === city.id ? 'var(--accent-blue)' : 'var(--glass-border)'}`,
                background: activeId === city.id ? 'var(--accent-blue-glass)' : 'var(--glass-bg)',
                color: activeId === city.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              {city.name}
            </button>
            <button
              onClick={() => removeWeatherCity(city.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 2 }}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowSearch(s => !s)}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', border: '1px dashed var(--glass-border)', background: 'none', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={10} /> City
        </button>
      </div>

      {/* City search */}
      {showSearch && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Search city..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{ fontSize: 13, paddingLeft: 32 }}
            />
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            {searching && <Loader2 size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', animation: 'spin 1s linear infinite' }} />}
          </div>
          {results.length > 0 && (
            <div style={{ marginTop: 6, background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => { addWeatherCity(r); setActiveId(r.id); setShowSearch(false); setQuery(''); setResults([]) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg-hover)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  {r.name}, {r.country}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weather data */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
          <div className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      )}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <Cloud size={24} style={{ color: 'var(--text-tertiary)', margin: '0 auto 6px' }} />
          <p className="body-xs">{error}</p>
        </div>
      )}
      {data && !loading && (() => {
        const { label, emoji } = weatherDesc(data.code)
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
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
      })()}
    </div>
  )
}

/* ── Spotify widget ───────────────────────────────────────────── */
function SpotifyContent() {
  const [connected, setConnected]   = useState(isSpotifyConnected)
  const [hasClientId, setHasClient] = useState(() => !!getSpotifyClientId())
  const [current, setCurrent]       = useState<SpotifyTrack | null>(null)
  const [recent, setRecent]         = useState<SpotifyTrack[]>([])
  const [loading, setLoading]       = useState(false)
  const [ctrlError, setCtrlError]   = useState<string | null>(null)
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
    pollRef.current = setInterval(load, 15_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [connected, load])

  const handleCtrl = async (action: () => Promise<{ ok: boolean; needsPremium?: boolean }>) => {
    setCtrlError(null)
    const res = await action()
    if (res.needsPremium) setCtrlError('Playback controls require Spotify Premium')
    else if (!res.ok) setCtrlError('No active Spotify device found. Open Spotify on any device first.')
    else setTimeout(load, 800)
  }

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
      <button className="btn-primary" onClick={() => initiateSpotifyAuth().catch(() => {})}
        style={{ background: '#1DB954', borderColor: '#1DB954', fontSize: 13 }}>
        Connect Spotify
      </button>
    </div>
  )

  const track = current ?? recent[0] ?? null
  return (
    <div>
      {track ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          {track.albumArt && (
            <img src={track.albumArt} alt={track.album}
              style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
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
              <div style={{ marginTop: 6 }}>
                <div style={{ background: 'var(--glass-border)', borderRadius: 2, height: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#1DB954', borderRadius: 2,
                    width: `${Math.round((current.progressMs / current.durationMs) * 100)}%`,
                    transition: 'width 1s linear',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span className="body-xs">{fmtDuration(current.progressMs)}</span>
                  <span className="body-xs">{fmtDuration(current.durationMs)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="body-sm" style={{ marginBottom: 12, color: 'var(--text-tertiary)' }}>
          {loading ? 'Loading...' : 'Nothing playing right now.'}
        </p>
      )}

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={() => handleCtrl(spotifyPrev)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 6, borderRadius: '50%', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg-active)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
          <SkipBack size={18} />
        </button>
        <button
          onClick={() => handleCtrl(current?.isPlaying ? spotifyPause : spotifyPlay)}
          style={{ background: '#1DB954', border: 'none', cursor: 'pointer', color: '#000', display: 'flex', padding: 8, borderRadius: '50%', boxShadow: '0 2px 8px rgba(29,185,84,0.4)', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}>
          {current?.isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button onClick={() => handleCtrl(spotifyNext)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 6, borderRadius: '50%', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-bg-active)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}>
          <SkipForward size={18} />
        </button>
      </div>

      {ctrlError && (
        <p className="body-xs" style={{ color: 'var(--accent-orange)', textAlign: 'center', marginBottom: 8 }}>{ctrlError}</p>
      )}

      {recent.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {recent.slice(0, 2).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {t.albumArt && <img src={t.albumArt} alt="" style={{ width: 28, height: 28, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                <p className="body-xs">{t.artists}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => { clearSpotifyAuth(); setConnected(false); setCurrent(null); setRecent([]) }}
        style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        Disconnect
      </button>
    </div>
  )
}

/* ── Stats widget ─────────────────────────────────────────────── */
function StatsContent({ tasks, goals, events, books }: { tasks: Task[]; goals: Goal[]; events: CalendarEvent[]; books: BookType[] }) {
  const todayCount  = tasks.filter(t => t.status === 'today').length
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0
  const nextEvent   = events.filter(e => new Date(e.start) >= new Date()).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
  const daysUntil   = nextEvent ? differenceInDays(new Date(nextEvent.start), new Date()) : null
  const readingCount = books.filter(b => b.status === 'reading').length

  const tiles = [
    { value: todayCount, label: 'Tasks today', accent: 'var(--accent-blue)' },
    { value: `${avgProgress}%`, label: 'Goals avg', accent: 'var(--accent-purple)' },
    { value: daysUntil !== null ? (daysUntil === 0 ? 'Today' : `${daysUntil}d`) : '—', label: 'Next event', accent: 'var(--accent-green)' },
    { value: readingCount, label: 'Reading', accent: 'var(--accent-orange)' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {tiles.map(t => (
        <div key={t.label} className="stat-tile">
          <span className="stat-tile-value" style={{ color: t.accent }}>{t.value}</span>
          <span className="stat-tile-label">{t.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Tasks today widget ───────────────────────────────────────── */
function TasksTodayContent({ tasks }: { tasks: Task[] }) {
  const { updateTask } = useActions()
  const today = tasks.filter(t => t.status === 'today')
  return !today.length ? (
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
  )
}

/* ── Calendar widget ──────────────────────────────────────────── */
function CalendarContent({ events }: { events: CalendarEvent[] }) {
  const upcoming = events.filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 5)
  return !upcoming.length ? (
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
            <div style={{ width: 4, height: 36, borderRadius: 2, background: sourceColor, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</p>
              <p className="body-xs">{dayLabel}{!event.allDay && ` · ${format(start, 'h:mm a')}`}{event.location && ` · ${event.location}`}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Goals widget ─────────────────────────────────────────────── */
const catColor: Record<string, 'green' | 'blue' | 'orange' | 'purple' | 'pink' | 'red'> = {
  Health: 'green', Finance: 'blue', Career: 'orange', Learning: 'purple', Personal: 'pink', Relationships: 'red',
}

function GoalsContent({ goals }: { goals: Goal[] }) {
  return !goals.length ? (
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
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</span>
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
  )
}

/* ── Books widget ─────────────────────────────────────────────── */
const STATUS_LABELS: Record<BookStatus, string> = { reading: 'Reading', finished: 'Finished', 'want-to-read': 'Want to read' }
const STATUS_COLORS: Record<BookStatus, 'green' | 'blue' | 'default'> = { reading: 'green', finished: 'blue', 'want-to-read': 'default' }

function BooksContent() {
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
    <div>
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
    </div>
  )
}

/* ── Milestones widget ────────────────────────────────────────── */
const moodEmoji: Record<string, string> = { amazing: '🌟', good: '😊', neutral: '😐', tough: '😕', difficult: '😔' }

function MilestonesContent({ events }: { events: LifeEvent[] }) {
  return !events.length ? (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <Sparkles size={28} style={{ color: 'var(--accent-yellow)', margin: '0 auto 8px', opacity: 0.5 }} />
      <p className="body-sm">Log your first life milestone.</p>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.slice(0, 4).map(event => (
        <div key={event.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{moodEmoji[event.mood]}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{event.title}</p>
            <p className="body-xs">{format(parseISO(event.date), 'MMM d, yyyy')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Recipes / Meal Planner widget ────────────────────────────── */
const MEAL_TYPES: Array<{ key: keyof MealDay; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch'     },
  { key: 'dinner',    label: 'Dinner'    },
  { key: 'snack',     label: 'Snack'     },
]

function RecipesContent() {
  const mealPlan = useStore(s => s.mealPlan)
  const [generating, setGenerating]   = useState(false)
  const [genError, setGenError]       = useState<string | null>(null)
  const [activeDay, setActiveDay]     = useState(0) // 0–6 offset from today
  const [expandedMeal, setExpanded]   = useState<string | null>(null)
  const hasKey = isClaudeConfigured()

  // Current week dates (today + 6 days)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const activeDayData = mealPlan.days.find(d => d.date === weekDates[activeDay])

  async function handleGenerate() {
    setGenError(null)
    setGenerating(true)
    try {
      const days = await generateMealPlan(mealPlan.calorieTarget, mealPlan.preferences)
      days.forEach(day => setMealDay(day))
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      {/* Config row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 140 }}>
          <UtensilsCrossed size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            type="number"
            min={800} max={5000} step={50}
            value={mealPlan.calorieTarget}
            onChange={e => updateMealPlan({ calorieTarget: parseInt(e.target.value) || 2000 })}
            style={{ width: 70, fontSize: 13, background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '4px 8px', color: 'var(--text-primary)' }}
          />
          <span className="body-xs">kcal / day</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !hasKey}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            padding: '5px 14px', borderRadius: 'var(--radius-md)',
            background: hasKey ? '#1DB954' : 'var(--glass-bg-active)',
            border: 'none', color: hasKey ? '#000' : 'var(--text-tertiary)',
            cursor: hasKey && !generating ? 'pointer' : 'not-allowed', opacity: generating ? 0.7 : 1,
          }}
          title={!hasKey ? 'Add your Claude API key in Settings' : undefined}
        >
          {generating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ChefHat size={13} />}
          {generating ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>

      {/* Preferences */}
      <input
        className="input"
        placeholder="Preferences (e.g. vegetarian, no nuts)"
        value={mealPlan.preferences}
        onChange={e => updateMealPlan({ preferences: e.target.value })}
        style={{ fontSize: 12, marginBottom: 12, width: '100%' }}
      />

      {!hasKey && (
        <p className="body-xs" style={{ color: 'var(--accent-orange)', marginBottom: 10 }}>
          Add your Anthropic API key in <a href="/settings" style={{ color: 'var(--accent-blue)' }}>Settings</a> to generate meal plans.
        </p>
      )}
      {genError && <p className="body-xs" style={{ color: 'var(--accent-red)', marginBottom: 10 }}>{genError}</p>}

      {/* Day tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto' }}>
        {weekDates.map((date, i) => {
          const d = new Date(date)
          const hasMeals = mealPlan.days.some(day => day.date === date)
          return (
            <button key={date} onClick={() => setActiveDay(i)}
              style={{
                flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${activeDay === i ? 'var(--accent-pink)' : 'var(--glass-border)'}`,
                background: activeDay === i ? 'var(--accent-pink-glass)' : hasMeals ? 'var(--glass-bg-active)' : 'var(--glass-bg)',
                color: activeDay === i ? 'var(--accent-pink)' : 'var(--text-secondary)',
              }}
            >
              {i === 0 ? 'Today' : format(d, 'EEE')}
            </button>
          )
        })}
      </div>

      {/* Meals for active day */}
      {!activeDayData ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <ChefHat size={24} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px', opacity: 0.5 }} />
          <p className="body-sm">No meals planned.</p>
          {hasKey && <p className="body-xs">Click Generate Plan to create your week.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MEAL_TYPES.map(({ key, label }) => {
            const recipe = activeDayData[key] as any
            if (!recipe) return null
            const mealKey = `${activeDayData.date}-${key}`
            const isExpanded = expandedMeal === mealKey
            return (
              <div key={key} style={{ background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isExpanded ? null : mealKey)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="body-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.name}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-pink)' }}>{recipe.calories} kcal</p>
                    {(recipe.protein || recipe.carbs || recipe.fat) && (
                      <p className="body-xs">P:{recipe.protein}g C:{recipe.carbs}g F:{recipe.fat}g</p>
                    )}
                  </div>
                  {isExpanded ? <ChevronDown size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> : <ChevronRight size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                </div>
                {isExpanded && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--glass-border)' }}>
                    {recipe.prepTime && <p className="body-xs" style={{ marginTop: 8, marginBottom: 4 }}>Prep: {recipe.prepTime} min · Serves {recipe.servings || 1}</p>}
                    {recipe.ingredients?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <p className="body-xs" style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Ingredients</p>
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {recipe.ingredients.map((ing: string, i: number) => (
                            <li key={i} className="body-xs" style={{ marginBottom: 2 }}>{ing}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {recipe.instructions && (
                      <div>
                        <p className="body-xs" style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Instructions</p>
                        <p className="body-xs">{recipe.instructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Widget renderer ──────────────────────────────────────────── */
function renderWidgetContent(w: Widget, tasks: Task[], goals: Goal[], lifeEvents: LifeEvent[], calendarEvents: CalendarEvent[], books: BookType[]) {
  switch (w.type) {
    case 'weather':            return <WeatherContent />
    case 'spotify':            return <SpotifyContent />
    case 'tasks-today':        return <TasksTodayContent tasks={tasks} />
    case 'calendar-upcoming':  return <CalendarContent events={calendarEvents} />
    case 'goals-progress':     return <GoalsContent goals={goals} />
    case 'books':              return <BooksContent />
    case 'life-events-recent': return <MilestonesContent events={lifeEvents} />
    case 'stats':              return <StatsContent tasks={tasks} goals={goals} events={calendarEvents} books={books} />
    case 'recipes':            return <RecipesContent />
    default:                   return null
  }
}

/* ── Dashboard page ───────────────────────────────────────────── */
export default function DashboardPage() {
  const tasks          = useStore(s => s.tasks)
  const goals          = useStore(s => s.goals)
  const lifeEvents     = useStore(s => s.lifeEvents)
  const calendarEvents = useStore(s => s.calendarEvents)
  const books          = useStore(s => s.books)
  const allWidgets     = useStore(s => s.widgets)

  const [editMode, setEditMode]           = useState(false)
  const [showPicker, setShowPicker]       = useState(false)

  const todayCount     = tasks.filter(t => t.status === 'today').length
  const visibleWidgets = [...allWidgets].filter(w => w.visible).sort((a, b) => a.order - b.order)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = visibleWidgets.findIndex(w => w.id === active.id)
    const newIndex = visibleWidgets.findIndex(w => w.id === over.id)
    const reordered = arrayMove(visibleWidgets, oldIndex, newIndex).map((w, i) => ({ ...w, order: i }))
    // Merge back with hidden widgets
    const hidden = allWidgets.filter(w => !w.visible)
    reorderWidgets([...reordered, ...hidden])
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
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
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowPicker(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Widget
          </button>
          <button
            className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setEditMode(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Settings2 size={14} /> {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {editMode && (
        <div style={{ marginBottom: 16, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)' }}>
          <p className="body-xs" style={{ color: 'var(--text-secondary)' }}>
            Drag widgets to reorder. Click X to hide a widget. Use "+ Widget" to add more.
          </p>
        </div>
      )}

      {/* Sortable grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="dash-grid">
            {visibleWidgets.map(widget => (
              <SortableItem key={widget.id} id={widget.id} editMode={editMode}>
                {(listeners) => (
                  <DashCard
                    widget={widget}
                    title={WIDGET_TITLES[widget.type]}
                    icon={WIDGET_ICONS[widget.type]}
                    accent={WIDGET_ACCENTS[widget.type]}
                    editMode={editMode}
                    dragListeners={listeners}
                  >
                    {renderWidgetContent(widget, tasks, goals, lifeEvents, calendarEvents, books)}
                  </DashCard>
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {visibleWidgets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p className="body-sm" style={{ marginBottom: 12 }}>No widgets visible.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPicker(true)}>
            <Plus size={14} /> Add Widgets
          </button>
        </div>
      )}

      {showPicker && <WidgetPicker onClose={() => setShowPicker(false)} />}
    </div>
  )
}
