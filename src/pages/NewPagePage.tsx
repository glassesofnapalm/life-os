import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, StickyNote, Database, Columns, CheckSquare, Plus, Type } from 'lucide-react';
import { useActions, addCustomPage } from '@/stores/store';

const ICON_OPTIONS = [
  '📄', '📝', '📋', '📊', '📈', '🗂️', '📌', '🎯', '💡', '🔖',
  '🏠', '💼', '🎨', '🧠', '❤️', '🌟', '🔬', '📚', '🎵', '🏋️',
];

const TEMPLATES = [
  { key: 'blank' as const, label: 'Blank', description: 'Start from scratch', icon: FileText },
  { key: 'notes' as const, label: 'Notes', description: 'Lined notepad for writing', icon: StickyNote },
  { key: 'tasks' as const, label: 'Tasks', description: 'Task list for this page', icon: CheckSquare },
  { key: 'database' as const, label: 'Database', description: 'Table with columns and rows', icon: Database },
  { key: 'kanban' as const, label: 'Kanban', description: 'Board with columns', icon: Columns },
];

export function NewPagePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📄');
  const [template, setTemplate] = useState<'blank' | 'notes' | 'database' | 'kanban' | 'tasks'>('blank');

  const handleCreate = () => {
    if (!title.trim()) return;
    const newId = addCustomPage({
      title: title.trim(),
      icon,
      content: '',
      template,
      pinned: false,
    });
    navigate(`/page/${newId}`);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Plus style={{ width: 32, height: 32, color: 'var(--accent-blue)' }} />
          <h1 className="heading-xl" style={{ color: 'var(--text-primary)', margin: 0 }}>
            New Page
          </h1>
        </div>
        <p className="body-sm" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Create a custom page for your Life OS
        </p>
      </motion.div>

      {/* Title Input */}
      <div className="glass-card" style={{ padding: 20 }}>
        <label
          className="label"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 10,
          }}
        >
          <Type style={{ width: 14, height: 14 }} />
          Page Title
        </label>
        <input
          className="input"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Untitled Page"
          autoFocus
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            width: '100%',
          }}
        />
      </div>

      {/* Icon Picker */}
      <div className="glass-card" style={{ padding: 20 }}>
        <label
          className="label"
          style={{
            display: 'block',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          Icon
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ICON_OPTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setIcon(emoji)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: icon === emoji ? 'rgba(var(--accent-blue-rgb, 59,130,246), 0.15)' : 'var(--glass-bg)',
                border: icon === emoji
                  ? '2px solid var(--accent-blue)'
                  : '2px solid transparent',
                transform: icon === emoji ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Template Selection */}
      <div>
        <label
          className="label"
          style={{
            display: 'block',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          Template
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {TEMPLATES.map(t => {
            const Icon = t.icon;
            const selected = template === t.key;
            return (
              <div
                key={t.key}
                className="glass-card"
                onClick={() => setTemplate(t.key)}
                style={{
                  padding: 20,
                  cursor: 'pointer',
                  border: selected
                    ? '2px solid var(--accent-blue)'
                    : '2px solid var(--glass-border)',
                  background: selected
                    ? 'rgba(var(--accent-blue-rgb, 59,130,246), 0.08)'
                    : 'var(--glass-bg)',
                  boxShadow: selected
                    ? '0 0 16px rgba(var(--accent-blue-rgb, 59,130,246), 0.2)'
                    : undefined,
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 8,
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  <Icon
                    style={{
                      width: 32,
                      height: 32,
                      color: selected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    }}
                  />
                  <span
                    className="label"
                    style={{
                      fontWeight: 600,
                      color: selected ? 'var(--accent-blue)' : 'var(--text-primary)',
                    }}
                  >
                    {t.label}
                  </span>
                  <span className="body-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ display: 'flex', justifyContent: 'flex-end' }}
      >
        <button
          className="btn btn-primary btn-lg"
          disabled={!title.trim()}
          onClick={handleCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus style={{ width: 20, height: 20 }} />
          Create Page
        </button>
      </motion.div>
    </div>
  );
}
