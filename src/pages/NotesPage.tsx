import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import {
  FolderOpen, Plus, Pencil, Trash2, X, Check, FileText, Pin, Search,
} from 'lucide-react'
import {
  useStore,
  addNoteFolder, updateNoteFolder, deleteNoteFolder,
  addNote, updateNote, deleteNote,
} from '@/stores/store'
import type { NoteFolder, Note } from '@/types'

const FOLDER_ICONS = ['📁', '📚', '💡', '🎯', '❤️', '🌱', '🔒', '⭐', '🧠', '✍️', '🏠', '💼']
const FOLDER_COLORS = [
  'var(--accent-blue)', 'var(--accent-purple)', 'var(--accent-green)',
  'var(--accent-orange)', 'var(--accent-pink)', 'var(--accent-red)',
  'var(--accent-yellow)',
]

function FolderEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<NoteFolder>
  onSave: (name: string, icon: string, color: string) => void
  onCancel: () => void
}) {
  const [name, setName]   = useState(initial?.name ?? '')
  const [icon, setIcon]   = useState(initial?.icon ?? '📁')
  const [color, setColor] = useState(initial?.color ?? 'var(--accent-blue)')

  return (
    <div style={{ padding: '12px 14px', background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
      <input
        className="input"
        placeholder="Folder name"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
        style={{ marginBottom: 10, fontSize: 13 }}
        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim(), icon, color) }}
      />
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {FOLDER_ICONS.map(i => (
          <button
            key={i}
            onClick={() => setIcon(i)}
            style={{ fontSize: 16, padding: '2px 4px', borderRadius: 6, border: icon === i ? '2px solid var(--accent-blue)' : '2px solid transparent', background: 'none', cursor: 'pointer' }}
          >
            {i}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {FOLDER_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" style={{ fontSize: 12, flex: 1 }} disabled={!name.trim()} onClick={() => name.trim() && onSave(name.trim(), icon, color)}>
          Save
        </button>
        <button className="btn-ghost" style={{ fontSize: 12, flex: 1 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function NoteEditor({ note }: { note: Note }) {
  const titleRef   = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // sync when note changes
  useEffect(() => {
    if (titleRef.current)   titleRef.current.value   = note.title
    if (contentRef.current) contentRef.current.value = note.content
  }, [note.id])

  const schedSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateNote(note.id, {
        title:   titleRef.current?.value   ?? note.title,
        content: contentRef.current?.value ?? note.content,
      })
    }, 600)
  }, [note.id, note.title, note.content])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          ref={titleRef}
          defaultValue={note.title}
          onChange={schedSave}
          placeholder="Note title..."
          style={{
            flex: 1, fontSize: 17, fontWeight: 600,
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => updateNote(note.id, { pinned: !note.pinned })}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: note.pinned ? 'var(--accent-yellow)' : 'var(--text-tertiary)',
            display: 'flex',
          }}
          title={note.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={14} style={{ fill: note.pinned ? 'var(--accent-yellow)' : 'none' }} />
        </button>
        <span className="body-xs" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {format(parseISO(note.updated_at), 'MMM d, h:mm a')}
        </span>
      </div>
      <textarea
        ref={contentRef}
        defaultValue={note.content}
        onChange={schedSave}
        placeholder="Start writing..."
        style={{
          flex: 1, resize: 'none',
          padding: '18px 20px',
          background: 'none', border: 'none', outline: 'none',
          fontSize: 14, lineHeight: 1.7,
          color: 'var(--text-primary)', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

export default function NotesPage() {
  const noteFolders = useStore(s => s.noteFolders)
  const notes       = useStore(s => s.notes)

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [activeNoteId,   setActiveNoteId]   = useState<string | null>(null)
  const [showNewFolder,  setShowNewFolder]  = useState(false)
  const [editingFolder,  setEditingFolder]  = useState<string | null>(null)
  const [searchQuery,    setSearchQuery]    = useState('')

  const activeFolder = noteFolders.find(f => f.id === activeFolderId) ?? null
  const activeNote   = notes.find(n => n.id === activeNoteId) ?? null

  const folderNotes = (folderId: string) =>
    notes.filter(n => n.folder_id === folderId).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  const searchResults = searchQuery.trim()
    ? notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 20)
    : []

  function handleNewFolder(name: string, icon: string, color: string) {
    addNoteFolder(name, icon, color)
    setShowNewFolder(false)
  }

  function handleEditFolder(id: string, name: string, icon: string, color: string) {
    updateNoteFolder(id, { name, icon, color })
    setEditingFolder(null)
  }

  function handleDeleteFolder(id: string) {
    if (!confirm('Delete this folder and all its notes?')) return
    if (activeFolderId === id) { setActiveFolderId(null); setActiveNoteId(null) }
    deleteNoteFolder(id)
  }

  function handleNewNote(folderId: string) {
    const id = addNote(folderId)
    setActiveNoteId(id)
  }

  function handleDeleteNote(id: string) {
    if (activeNoteId === id) setActiveNoteId(null)
    deleteNote(id)
  }

  const sortedFolders = [...noteFolders].sort((a, b) => a.order - b.order)

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)', minHeight: 400, overflow: 'hidden', borderRadius: 'var(--radius-xl)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>

      {/* ── Folders sidebar ── */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
              Folders
            </span>
            <button
              onClick={() => setShowNewFolder(f => !f)}
              className="btn-icon"
              title="New folder"
            >
              <Plus size={13} />
            </button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ fontSize: 12, paddingLeft: 28 }}
            />
            <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-tertiary)' }}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {showNewFolder && (
            <FolderEditor
              onSave={handleNewFolder}
              onCancel={() => setShowNewFolder(false)}
            />
          )}

          {sortedFolders.length === 0 && !showNewFolder && (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-tertiary)' }}>
              <FolderOpen size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ fontSize: 12 }}>No folders yet</p>
              <button
                onClick={() => setShowNewFolder(true)}
                style={{ fontSize: 11, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6 }}
              >
                Create one →
              </button>
            </div>
          )}

          {sortedFolders.map(folder => (
            <div key={folder.id}>
              {editingFolder === folder.id ? (
                <FolderEditor
                  initial={folder}
                  onSave={(n, i, c) => handleEditFolder(folder.id, n, i, c)}
                  onCancel={() => setEditingFolder(null)}
                />
              ) : (
                <button
                  onClick={() => { setActiveFolderId(folder.id); setActiveNoteId(null); setSearchQuery('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px', borderRadius: 'var(--radius-md)',
                    background: activeFolderId === folder.id ? 'var(--glass-bg-active)' : 'none',
                    border: activeFolderId === folder.id ? `1px solid ${folder.color}33` : '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{folder.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: activeFolderId === folder.id ? folder.color : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {folderNotes(folder.id).length}
                  </span>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingFolder(folder.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)', display: 'flex' }}
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)', display: 'flex' }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Notes list ── */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {searchQuery ? (
          <>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchResults.map(note => {
                const folder = noteFolders.find(f => f.id === note.folder_id)
                return (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isActive={activeNoteId === note.id}
                    accent={folder?.color ?? 'var(--accent-blue)'}
                    subtitle={folder?.name}
                    onClick={() => { setActiveNoteId(note.id); setActiveFolderId(note.folder_id) }}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                )
              })}
            </div>
          </>
        ) : activeFolder ? (
          <>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{activeFolder.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: activeFolder.color }}>
                  {activeFolder.name}
                </span>
              </div>
              <button
                onClick={() => handleNewNote(activeFolder.id)}
                className="btn-icon"
                title="New note"
              >
                <Plus size={13} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {folderNotes(activeFolder.id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-tertiary)' }}>
                  <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ fontSize: 12 }}>No notes yet</p>
                  <button
                    onClick={() => handleNewNote(activeFolder.id)}
                    style={{ fontSize: 11, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6 }}
                  >
                    Create one →
                  </button>
                </div>
              ) : (
                folderNotes(activeFolder.id).map(note => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isActive={activeNoteId === note.id}
                    accent={activeFolder.color}
                    onClick={() => setActiveNoteId(note.id)}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <p className="body-sm" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Select a folder to see notes
            </p>
          </div>
        )}
      </div>

      {/* ── Note editor ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeNote ? (
          <NoteEditor key={activeNote.id} note={activeNote} />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, color: 'var(--text-tertiary)' }}>
            <FileText size={40} style={{ opacity: 0.25 }} />
            <p className="body-sm">Select a note to start editing</p>
            {activeFolder && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleNewNote(activeFolder.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={13} /> New note in {activeFolder.name}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteListItem({
  note, isActive, accent, subtitle, onClick, onDelete,
}: {
  note: Note
  isActive: boolean
  accent: string
  subtitle?: string
  onClick: () => void
  onDelete: () => void
}) {
  const [hovering, setHovering] = useState(false)
  const preview = note.content.replace(/\n/g, ' ').slice(0, 80) || 'Empty note'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        padding: '10px 14px', cursor: 'pointer',
        background: isActive ? 'var(--glass-bg-active)' : hovering ? 'var(--glass-bg-hover)' : 'none',
        borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
        transition: 'all 0.1s',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
        {note.pinned && <Pin size={10} style={{ color: 'var(--accent-yellow)', fill: 'var(--accent-yellow)', flexShrink: 0, marginTop: 2 }} />}
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {note.title || 'Untitled'}
        </span>
        {hovering && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)', display: 'flex', flexShrink: 0 }}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: subtitle ? 2 : 0 }}>
        {preview}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {subtitle && <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{subtitle}</span>}
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {format(parseISO(note.updated_at), 'MMM d')}
        </span>
      </div>
    </div>
  )
}
