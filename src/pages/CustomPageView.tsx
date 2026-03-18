import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pin, PinOff, Trash2, Edit3, FileText, Plus, Check, Circle } from 'lucide-react';
import { useStore, useActions } from '@/stores/store';
import type { CustomPage, TaskPriority, TaskStatus } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// ── Blank template ──────────────────────────────────────────
function BlankEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  return (
    <div
      className="glass-card"
      style={{ padding: 20, minHeight: 400 }}
    >
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder="Start writing..."
        style={{
          width: '100%',
          minHeight: 360,
          background: 'transparent',
          color: 'var(--text-primary)',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: 15,
          lineHeight: 1.7,
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

// ── Notes template ──────────────────────────────────────────
function NotesEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        minHeight: 400,
        background: 'var(--glass-bg-hover)',
      }}
    >
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder="Take a note..."
        style={{
          width: '100%',
          minHeight: 360,
          background: 'transparent',
          color: 'var(--text-primary)',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: 15,
          lineHeight: '1.8',
          fontFamily: 'inherit',
          backgroundImage:
            'repeating-linear-gradient(transparent, transparent 31px, rgba(255,255,255,0.06) 31px, rgba(255,255,255,0.06) 32px)',
          paddingTop: 8,
        }}
      />
    </div>
  );
}

// ── Database template ───────────────────────────────────────
function DatabaseView({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  const data = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.rows)) return parsed;
    } catch {
      // fall through
    }
    return {
      columns: ['Name', 'Status', 'Notes'],
      rows: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
    };
  }, [content]);

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = data.rows.map((row: string[], ri: number) =>
      ri === rowIdx ? row.map((cell: string, ci: number) => (ci === colIdx ? value : cell)) : row
    );
    onChange(JSON.stringify({ ...data, rows: newRows }));
  };

  const addRow = () => {
    const newRows = [...data.rows, data.columns.map(() => '')];
    onChange(JSON.stringify({ ...data, rows: newRows }));
  };

  return (
    <div className="glass-card" style={{ padding: 20, overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {data.columns.map((col: string, ci: number) => (
              <th
                key={ci}
                className="label"
                style={{
                  textAlign: 'left',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--glass-border)',
                  fontWeight: 500,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row: string[], ri: number) => (
            <tr
              key={ri}
              style={{
                borderBottom: ri < data.rows.length - 1 ? '1px solid var(--glass-border)' : 'none',
              }}
            >
              {row.map((cell: string, ci: number) => (
                <td key={ci} style={{ padding: '4px 4px' }}>
                  <input
                    type="text"
                    value={cell}
                    onChange={e => updateCell(ri, ci, e.target.value)}
                    placeholder="..."
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: 'none',
                      outline: 'none',
                      padding: '6px 8px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      transition: 'background 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
                    onBlur={e => { e.currentTarget.style.background = 'transparent'; }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={addRow}
        >
          + Add row
        </button>
      </div>
    </div>
  );
}

// ── Kanban template ─────────────────────────────────────────
function KanbanBoard({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  const data = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.columns) return parsed;
    } catch {
      // fall through
    }
    return {
      columns: [
        { title: 'To Do', cards: [''] },
        { title: 'In Progress', cards: [''] },
        { title: 'Done', cards: [''] },
      ],
    };
  }, [content]);

  const updateCard = (colIdx: number, cardIdx: number, value: string) => {
    const newColumns = data.columns.map((col: any, ci: number) =>
      ci === colIdx
        ? { ...col, cards: col.cards.map((c: string, idx: number) => (idx === cardIdx ? value : c)) }
        : col
    );
    onChange(JSON.stringify({ columns: newColumns }));
  };

  const addCard = (colIdx: number) => {
    const newColumns = data.columns.map((col: any, ci: number) =>
      ci === colIdx ? { ...col, cards: [...col.cards, ''] } : col
    );
    onChange(JSON.stringify({ columns: newColumns }));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      {data.columns.map((col: any, ci: number) => (
        <div key={ci} className="glass-card" style={{ padding: 16 }}>
          <h3
            className="label"
            style={{
              color: 'var(--text-primary)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            {col.title}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {col.cards.map((card: string, cardIdx: number) => (
              <input
                key={cardIdx}
                type="text"
                value={card}
                onChange={e => updateCard(ci, cardIdx, e.target.value)}
                placeholder="Add a card..."
                style={{
                  width: '100%',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 12,
                  outline: 'none',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.background = 'var(--glass-bg-hover)'; }}
                onBlur={e => { e.currentTarget.style.background = 'var(--glass-bg)'; }}
              />
            ))}
          </div>
          <button
            onClick={() => addCard(ci)}
            className="body-xs"
            style={{
              marginTop: 8,
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            + Add card
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Tasks template ──────────────────────────────────────────
function PageTasksView({ pageId }: { pageId: string }) {
  const state = useStore();
  const { addTask, updateTask, deleteTask } = useActions();
  const tasks = state.tasks.filter(t => t.page_id === pageId);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newStatus, setNewStatus] = useState<TaskStatus>('today');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask({ title: newTitle.trim(), priority: newPriority, status: newStatus, due_date: null, tags: [], notes: '', page_id: pageId });
    setNewTitle('');
    setShowAdd(false);
  };

  const PRIORITY_COLOR: Record<TaskPriority, string> = { urgent: 'red', high: 'orange', medium: 'blue', low: 'default' };

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="label">Tasks ({tasks.length})</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={13} /> Add Task
        </button>
      </div>

      {tasks.length === 0 && !showAdd && (
        <p className="body-sm" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)' }}>
          No tasks yet — add one above.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tasks.map(task => (
          <div key={task.id} className="task-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className={`checkbox${task.status === 'done' ? ' checked' : ''}`}
              onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'today' : 'done' })}
              style={{ flexShrink: 0 }}
            >
              {task.status === 'done' && <Check size={10} style={{ color: '#fff' }} />}
            </button>
            <span style={{ flex: 1, fontSize: 14, color: task.status === 'done' ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
              {task.title}
            </span>
            <span className={`badge badge-${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
            <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <Modal open={showAdd} title="Add Task" onClose={() => setShowAdd(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Title</label>
            <input className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..." autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Priority</label>
              <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)}>
                {(['urgent','high','medium','low'] as TaskPriority[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value as TaskStatus)}>
                {(['today','upcoming','backlog'] as TaskStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost btn-md" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary btn-md" onClick={handleAdd} disabled={!newTitle.trim()}>Add Task</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main CustomPageView ─────────────────────────────────────
export function CustomPageView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useStore();
  const { updateCustomPage, deleteCustomPage } = useActions();

  const page = useMemo(
    () => state.customPages.find((p: CustomPage) => p.id === id),
    [state.customPages, id]
  );

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');

  useEffect(() => {
    if (page) {
      setTitleDraft(page.title);
      setContentDraft(page.content);
    }
  }, [page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save content changes with 500ms debounce
  useEffect(() => {
    if (!page || contentDraft === page.content) return;
    const timer = setTimeout(() => {
      updateCustomPage(page.id, { content: contentDraft });
    }, 500);
    return () => clearTimeout(timer);
  }, [contentDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!page) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 256,
          gap: 16,
        }}
      >
        <FileText style={{ width: 48, height: 48, color: 'var(--text-tertiary)' }} />
        <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
          Page not found
        </p>
        <button
          className="btn btn-primary btn-md"
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== page.title) {
      updateCustomPage(page.id, { title: titleDraft.trim() });
    } else {
      setTitleDraft(page.title);
    }
  };

  const handleTogglePin = () => {
    updateCustomPage(page.id, { pinned: !page.pinned });
  };

  const handleDelete = () => {
    deleteCustomPage(page.id);
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 896, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setTitleDraft(page.title);
                  setEditingTitle(false);
                }
              }}
              className="input"
              style={{
                flex: 1,
                background: 'transparent',
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--text-primary)',
                outline: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '2px solid var(--accent-blue)',
                borderRadius: 0,
                padding: '0 0 4px 0',
              }}
            />
          ) : (
            <h1
              className="heading-xl"
              onClick={() => setEditingTitle(true)}
              style={{
                color: 'var(--text-primary)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            >
              {page.title}
            </h1>
          )}

          {!editingTitle && (
            <button
              onClick={() => setEditingTitle(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                flexShrink: 0,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Edit3 style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleTogglePin}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {page.pinned
              ? <PinOff style={{ width: 16, height: 16 }} />
              : <Pin style={{ width: 16, height: 16 }} />}
            {page.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            className="btn btn-sm"
            onClick={handleDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(239,68,68,0.12)',
              color: 'rgb(248,113,113)',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            <Trash2 style={{ width: 16, height: 16 }} />
            Delete
          </button>
        </div>
      </div>

      {/* Template badge */}
      <p
        className="body-xs"
        style={{
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: -12,
        }}
      >
        {page.template} template
      </p>

      {/* Template-specific content */}
      {page.template === 'blank' && (
        <BlankEditor content={contentDraft} onChange={setContentDraft} />
      )}
      {page.template === 'notes' && (
        <NotesEditor content={contentDraft} onChange={setContentDraft} />
      )}
      {page.template === 'database' && (
        <DatabaseView content={contentDraft} onChange={setContentDraft} />
      )}
      {page.template === 'kanban' && (
        <KanbanBoard content={contentDraft} onChange={setContentDraft} />
      )}
      {page.template === 'tasks' && (
        <PageTasksView pageId={page.id} />
      )}
    </div>
  );
}
