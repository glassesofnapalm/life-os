import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Type, ImageIcon, Trash2, Quote, Move } from 'lucide-react'

import { useStore, useActions } from '@/stores/store'
import type { VisionBoardItem } from '@/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

// ---------------------------------------------------------------------------
// Draggable board item
// ---------------------------------------------------------------------------

function DraggableBoardItem({
  item,
  onDelete,
}: {
  item: VisionBoardItem
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  })
  const [hovered, setHovered] = useState(false)

  const style: React.CSSProperties = {
    position: 'absolute',
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.type === 'text' ? 'auto' : item.height,
    minHeight: item.type === 'text' ? 80 : undefined,
    transform: CSS.Translate.toString(transform),
    rotate: `${item.rotation}deg`,
    zIndex: isDragging ? 100 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: isDragging
            ? '0 24px 48px rgba(0,0,0,0.4)'
            : '0 4px 16px rgba(0,0,0,0.2)',
          border: isDragging
            ? '1px solid var(--accent-blue)'
            : '1px solid var(--glass-border)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
      >
        {/* Content */}
        {item.type === 'image' ? (
          <img
            src={item.content}
            alt="Vision board"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 'var(--radius-xl)',
              display: 'block',
              pointerEvents: 'none',
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: 20,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Quote
                style={{
                  width: 20,
                  height: 20,
                  color: 'var(--accent-purple)',
                  opacity: 0.5,
                  margin: '0 auto 8px',
                }}
              />
              <p
                className="body-sm"
                style={{
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                  fontWeight: 500,
                }}
              >
                &ldquo;{item.content}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Drag handle + delete overlay */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <div
            style={{
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Move style={{ width: 14, height: 14 }} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Delete item"
            style={{
              padding: 4,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
          >
            <Trash2 style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function VisionBoardPage() {
  const visionBoardItems = useStore((s) => s.visionBoardItems)
  const { addVisionBoardItem, updateVisionBoardItem, deleteVisionBoardItem } = useActions()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'image' | 'text'>('image')
  const [content, setContent] = useState('')

  const canvasRef = useRef<HTMLDivElement>(null)

  const openAddModal = (type: 'image' | 'text') => {
    setModalType(type)
    setContent('')
    setModalOpen(true)
  }

  const randomPosition = useCallback(() => {
    const canvas = canvasRef.current
    const maxX = canvas ? canvas.clientWidth - 260 : 400
    const maxY = canvas ? canvas.clientHeight - 220 : 400
    return {
      x: Math.max(20, Math.floor(Math.random() * maxX)),
      y: Math.max(20, Math.floor(Math.random() * maxY)),
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    const pos = randomPosition()

    addVisionBoardItem({
      type: modalType,
      content: content.trim(),
      x: pos.x,
      y: pos.y,
      width: modalType === 'image' ? 240 : 220,
      height: modalType === 'image' ? 200 : 140,
      rotation: Math.floor(Math.random() * 7) - 3,
      board_id: 'default',
    })

    setModalOpen(false)
    setContent('')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    const item = visionBoardItems.find((i) => i.id === active.id)
    if (!item) return

    updateVisionBoardItem(item.id, {
      x: item.x + delta.x,
      y: item.y + delta.y,
    })
  }

  const handleDelete = (id: string) => deleteVisionBoardItem(id)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <motion.header
        style={{
          flexShrink: 0,
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div>
          <h1 className="heading-xl">Vision Board</h1>
          <p className="body-sm" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Visualize your dreams, goals, and inspirations
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Type style={{ width: 16, height: 16 }} />}
            onClick={() => openAddModal('text')}
          >
            Add Quote
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus style={{ width: 16, height: 16 }} />}
            onClick={() => openAddModal('image')}
          >
            Add Image
          </Button>
        </div>
      </motion.header>

      {/* Canvas area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          margin: '0 32px 32px',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <div
          ref={canvasRef}
          className="canvas-bg"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-xl)',
            minHeight: '100%',
            minWidth: '100%',
          }}
        >
          <AnimatePresence>
            {visionBoardItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <ImageIcon
                  style={{
                    width: 64,
                    height: 64,
                    marginBottom: 16,
                    color: 'var(--text-secondary)',
                    opacity: 0.2,
                  }}
                />
                <p
                  className="body-sm"
                  style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}
                >
                  Your vision board is empty
                </p>
                <p className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Add images and quotes to bring your vision to life.
                </p>
              </motion.div>
            ) : (
              <DndContext onDragEnd={handleDragEnd}>
                {visionBoardItems.map((item) => (
                  <DraggableBoardItem key={item.id} item={item} onDelete={handleDelete} />
                ))}
              </DndContext>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add item modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'image' ? 'Add Image' : 'Add Quote'}
      >
        <form onSubmit={handleSubmit}>
          {modalType === 'image' ? (
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Image URL</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ImageIcon
                  style={{ width: 16, height: 16, color: 'var(--text-tertiary)', flexShrink: 0 }}
                />
                <input
                  type="url"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://example.com/inspiration.jpg"
                  className="input"
                  style={{ flex: 1 }}
                  required
                />
              </div>
              {content && (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    height: 128,
                  }}
                >
                  <img
                    src={content}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Quote or Affirmation</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Quote
                  style={{
                    width: 16,
                    height: 16,
                    color: 'var(--text-tertiary)',
                    flexShrink: 0,
                    marginTop: 10,
                  }}
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Dream big, start small, act now."
                  rows={3}
                  className="textarea"
                  style={{ flex: 1 }}
                  required
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {modalType === 'image' ? 'Add Image' : 'Add Quote'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
