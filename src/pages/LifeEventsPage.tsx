import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import {
  Plus,
  Heart,
  Trash2,
  Edit3,
  Calendar,
  Smile,
  Frown,
  Meh,
  Image,
} from 'lucide-react'

import { useStore, useActions } from '@/stores/store'
import type { LifeEvent } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

// ---------------------------------------------------------------------------
// Mood config
// ---------------------------------------------------------------------------

type Mood = LifeEvent['mood']

const moodConfig: Record<Mood, { label: string; color: string; icon: React.ReactNode }> = {
  amazing:  { label: 'Amazing',  color: 'green',   icon: <Heart className="w-3.5 h-3.5" /> },
  good:     { label: 'Good',     color: 'blue',    icon: <Smile className="w-3.5 h-3.5" /> },
  neutral:  { label: 'Neutral',  color: 'default', icon: <Meh   className="w-3.5 h-3.5" /> },
  tough:    { label: 'Tough',    color: 'orange',  icon: <Frown className="w-3.5 h-3.5" /> },
  difficult:{ label: 'Difficult',color: 'red',     icon: <Frown className="w-3.5 h-3.5" /> },
}

const moodOptions: Mood[] = ['amazing', 'good', 'neutral', 'tough', 'difficult']

const moodDotColor: Record<Mood, string> = {
  amazing:   'var(--accent-green)',
  good:      'var(--accent-blue)',
  neutral:   'var(--glass-border)',
  tough:     'var(--accent-orange)',
  difficult: 'var(--accent-red)',
}

// ---------------------------------------------------------------------------
// Empty form state
// ---------------------------------------------------------------------------

interface EventForm {
  date: string
  title: string
  description: string
  mood: Mood
  photo_url: string
}

const emptyForm: EventForm = {
  date: new Date().toISOString().split('T')[0],
  title: '',
  description: '',
  mood: 'good',
  photo_url: '',
}

// ---------------------------------------------------------------------------
// Timeline event card
// ---------------------------------------------------------------------------

function TimelineEventCard({
  event,
  side,
  onEdit,
  onDelete,
}: {
  event: LifeEvent
  side: 'left' | 'right'
  onEdit: (e: LifeEvent) => void
  onDelete: (id: string) => void
}) {
  const cfg = moodConfig[event.mood]
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'left' ? -24 : 24 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 'calc(50% - 2rem)',
        marginLeft: side === 'right' ? 'auto' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="glass-card" style={{ padding: '20px' }}>
        {/* Date row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Calendar style={{ width: 14, height: 14, color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <span className="body-xs" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {format(parseISO(event.date), 'MMMM d, yyyy')}
          </span>
        </div>

        {/* Title */}
        <h3 className="heading-sm" style={{ marginBottom: 4 }}>{event.title}</h3>

        {/* Description */}
        {event.description && (
          <p className="body-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
            {event.description}
          </p>
        )}

        {/* Photo */}
        {event.photo_url ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 160,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            <img
              src={event.photo_url}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: 112,
              borderRadius: 'var(--radius-md)',
              background: 'var(--glass-bg)',
              border: '1px dashed var(--glass-border)',
              marginBottom: 12,
            }}
          >
            <Image style={{ width: 24, height: 24, marginBottom: 4, color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <span className="body-xs" style={{ color: 'var(--text-tertiary)' }}>No photo</span>
          </div>
        )}

        {/* Footer: mood badge + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Badge color={cfg.color}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {cfg.icon}
              {cfg.label}
            </span>
          </Badge>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            <button
              onClick={() => onEdit(event)}
              className="btn-icon"
              aria-label="Edit event"
            >
              <Edit3 style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="btn-icon"
              style={{ color: 'var(--accent-red)' }}
              aria-label="Delete event"
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Mobile event card (no side constraint)
// ---------------------------------------------------------------------------

function MobileTimelineEventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: LifeEvent
  onEdit: (e: LifeEvent) => void
  onDelete: (id: string) => void
}) {
  const cfg = moodConfig[event.mood]
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Calendar style={{ width: 14, height: 14, color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <span className="body-xs" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {format(parseISO(event.date), 'MMMM d, yyyy')}
          </span>
        </div>

        <h3 className="heading-sm" style={{ marginBottom: 4 }}>{event.title}</h3>

        {event.description && (
          <p className="body-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
            {event.description}
          </p>
        )}

        {event.photo_url ? (
          <div
            style={{
              width: '100%',
              height: 140,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            <img
              src={event.photo_url}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: 96,
              borderRadius: 'var(--radius-md)',
              background: 'var(--glass-bg)',
              border: '1px dashed var(--glass-border)',
              marginBottom: 12,
            }}
          >
            <Image style={{ width: 20, height: 20, marginBottom: 4, color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <span className="body-xs" style={{ color: 'var(--text-tertiary)' }}>No photo</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Badge color={cfg.color}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {cfg.icon}
              {cfg.label}
            </span>
          </Badge>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            <button onClick={() => onEdit(event)} className="btn-icon" aria-label="Edit event">
              <Edit3 style={{ width: 14, height: 14 }} />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="btn-icon"
              style={{ color: 'var(--accent-red)' }}
              aria-label="Delete event"
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function LifeEventsPage() {
  const lifeEvents = useStore((s) => s.lifeEvents)
  const { addLifeEvent, updateLifeEvent, deleteLifeEvent } = useActions()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(emptyForm)

  // Sort events by date descending
  const sortedEvents = useMemo(
    () => [...lifeEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [lifeEvents],
  )

  const openNewModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (event: LifeEvent) => {
    setEditingId(event.id)
    setForm({
      date: event.date,
      title: event.title,
      description: event.description,
      mood: event.mood,
      photo_url: event.photo_url ?? '',
    })
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const payload = {
      date: form.date,
      title: form.title.trim(),
      description: form.description.trim(),
      mood: form.mood,
      photo_url: form.photo_url.trim() || null,
    }

    if (editingId) {
      updateLifeEvent(editingId, payload)
    } else {
      addLifeEvent(payload)
    }

    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = (id: string) => deleteLifeEvent(id)

  const updateField = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 24px',
        maxWidth: 896,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <motion.header
        style={{
          marginBottom: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div>
          <h1 className="heading-xl">Life Events</h1>
          <p className="body-sm" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Your personal timeline of milestones and memories
          </p>
        </div>

        <Button variant="primary" icon={<Plus style={{ width: 16, height: 16 }} />} onClick={openNewModal}>
          Add Event
        </Button>
      </motion.header>

      {/* Timeline */}
      {sortedEvents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 96,
            paddingBottom: 96,
          }}
        >
          <Heart
            style={{
              width: 48,
              height: 48,
              marginBottom: 12,
              color: 'var(--text-secondary)',
              opacity: 0.3,
            }}
          />
          <p className="body-sm" style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>
            No life events yet
          </p>
          <p className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
            Start logging your milestones and meaningful moments.
          </p>
        </motion.div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Central timeline line (desktop) */}
          <div
            className="timeline-line"
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              transform: 'translateX(-50%)',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            <AnimatePresence mode="popLayout">
              {sortedEvents.map((event, idx) => {
                const side: 'left' | 'right' = idx % 2 === 0 ? 'left' : 'right'

                return (
                  <div key={event.id} style={{ position: 'relative' }}>
                    {/* Timeline dot */}
                    <div
                      className="timeline-dot"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 24,
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: moodDotColor[event.mood],
                        boxShadow: '0 0 0 4px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    />

                    {/* Desktop alternating card */}
                    <TimelineEventCard
                      event={event}
                      side={side}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                    />
                  </div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Life Event' : 'New Life Event'}
      >
        <form onSubmit={handleSubmit}>
          {/* Date */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="input"
              style={{ width: '100%' }}
              required
            />
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="What happened?"
              className="input"
              style={{ width: '100%' }}
              required
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="How did it feel? What made it special?"
              rows={3}
              className="textarea"
              style={{ width: '100%' }}
            />
          </div>

          {/* Mood selector */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Mood</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {moodOptions.map((mood) => {
                const cfg = moodConfig[mood]
                const selected = form.mood === mood
                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => updateField('mood', mood)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12,
                      fontWeight: 500,
                      border: selected
                        ? '1px solid var(--accent-blue)'
                        : '1px solid var(--glass-border)',
                      background: selected
                        ? 'color-mix(in srgb, var(--accent-blue) 20%, transparent)'
                        : 'var(--glass-bg)',
                      color: selected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Photo URL */}
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Photo URL (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image style={{ width: 16, height: 16, color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <input
                type="url"
                value={form.photo_url}
                onChange={(e) => updateField('photo_url', e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="input"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingId ? 'Save Changes' : 'Add Event'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
