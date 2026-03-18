import { useState, useMemo } from 'react';
import { useStore, useActions } from '@/stores/store';
import type { Goal } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Plus, Target, Trash2, Edit3, Calendar, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CATEGORIES = ['Health', 'Finance', 'Career', 'Learning', 'Personal', 'Relationships'] as const;

type Category = (typeof CATEGORIES)[number];

const BADGE_COLOR: Record<Category, string> = {
  Health:        'green',
  Finance:       'blue',
  Career:        'orange',
  Learning:      'purple',
  Personal:      'pink',
  Relationships: 'red',
};

const PROGRESS_COLOR: Record<Category, 'green' | 'blue' | 'orange' | 'purple' | 'pink' | 'red'> = {
  Health:        'green',
  Finance:       'blue',
  Career:        'orange',
  Learning:      'purple',
  Personal:      'pink',
  Relationships: 'red',
};

interface GoalFormData {
  title: string;
  category: string;
  target_date: string;
  notes: string;
}

const emptyForm: GoalFormData = {
  title: '',
  category: 'Personal',
  target_date: '',
  notes: '',
};

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export default function GoalsPage() {
  const goals = useStore((s) => s.goals) as Goal[];
  const { addGoal, updateGoal, deleteGoal } = useActions();

  const [visionText, setVisionText] = useState(
    () => localStorage.getItem('life-os-vision') ?? ''
  );
  const [nonNegText, setNonNegText] = useState(
    () => localStorage.getItem('life-os-non-negotiables') ?? ''
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalFormData>(emptyForm);

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [goals]
  );

  const handleVisionChange = (value: string) => {
    setVisionText(value);
    localStorage.setItem('life-os-vision', value);
  };

  const handleNonNegChange = (value: string) => {
    setNonNegText(value);
    localStorage.setItem('life-os-non-negotiables', value);
  };

  const openAddModal = () => {
    setEditingGoal(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      category: goal.category,
      target_date: goal.target_date ?? '',
      notes: goal.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingGoal(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        title: form.title.trim(),
        category: form.category,
        target_date: form.target_date || null,
        notes: form.notes.trim(),
      });
    } else {
      addGoal({
        title: form.title.trim(),
        category: form.category,
        target_date: form.target_date || null,
        notes: form.notes.trim(),
        progress: 0,
        linked_task_ids: [],
        parent_id: null,
      });
    }
    handleCloseModal();
  };

  const handleProgressChange = (goal: Goal, progress: number) => {
    updateGoal(goal.id, { progress });
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Target size={28} color="var(--text-primary)" />
          <h1 className="heading-xl" style={{ margin: 0 }}>Goals</h1>
        </div>
        <Button className="btn btn-primary btn-md" onClick={openAddModal}>
          <Plus size={16} style={{ marginRight: '0.375rem' }} />
          Add Goal
        </Button>
      </div>

      {/* 5-Year Vision & Non-Negotiables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>

        {/* 5-Year Vision */}
        <GlassCard>
          <div style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Sparkles size={18} color="var(--accent-yellow, #f59e0b)" />
              <span className="heading-sm">5-Year Vision</span>
            </div>
            <textarea
              className="textarea"
              value={visionText}
              onChange={(e) => handleVisionChange(e.target.value)}
              placeholder="Describe where you want to be in 5 years..."
              style={{ width: '100%', minHeight: 120, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </GlassCard>

        {/* Non-Negotiables */}
        <GlassCard>
          <div style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Target size={18} color="var(--accent-red, #ef4444)" />
              <span className="heading-sm">Non-Negotiables</span>
            </div>
            <textarea
              className="textarea"
              value={nonNegText}
              onChange={(e) => handleNonNegChange(e.target.value)}
              placeholder="What will you never compromise on?"
              style={{ width: '100%', minHeight: 120, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </GlassCard>
      </div>

      {/* Goals grid */}
      {sortedGoals.length === 0 ? (
        <GlassCard>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Target size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem' }} />
            <p className="body-sm" style={{ color: 'var(--text-tertiary)' }}>
              No goals yet. Add your first goal to get started.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {sortedGoals.map((goal) => {
            const cat = goal.category as Category;
            const badgeColor = BADGE_COLOR[cat] ?? 'default';
            const progressColor = PROGRESS_COLOR[cat] ?? 'pink';
            const formattedDate = formatDate(goal.target_date);

            return (
              <GlassCard key={goal.id}>
                <div
                  className="goal-card"
                  style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
                  onMouseEnter={(e) => {
                    const actions = (e.currentTarget as HTMLElement).querySelector('.goal-actions') as HTMLElement | null;
                    if (actions) actions.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const actions = (e.currentTarget as HTMLElement).querySelector('.goal-actions') as HTMLElement | null;
                    if (actions) actions.style.opacity = '0';
                  }}
                >
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h3 className="heading-md" style={{ margin: 0, flex: 1 }}>{goal.title}</h3>
                    <div
                      className="goal-actions"
                      style={{ display: 'flex', gap: '0.25rem', opacity: 0, transition: 'opacity 0.15s', flexShrink: 0 }}
                    >
                      <button
                        className="btn-icon"
                        onClick={() => openEditModal(goal)}
                        aria-label="Edit goal"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => deleteGoal(goal.id)}
                        aria-label="Delete goal"
                        style={{ color: 'var(--accent-red, #ef4444)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Badge & date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <Badge color={badgeColor}>{goal.category}</Badge>
                    {formattedDate && (
                      <span className="body-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-tertiary)' }}>
                        <Calendar size={12} />
                        {formattedDate}
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="label" style={{ color: 'var(--text-secondary)' }}>Progress</span>
                      <span className="label" style={{ color: 'var(--text-primary)' }}>{goal.progress}%</span>
                    </div>
                    <ProgressBar value={goal.progress} color={progressColor} />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={goal.progress}
                      onChange={(e) => handleProgressChange(goal, Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--glass-border)' }}
                    />
                  </div>

                  {/* Notes */}
                  {goal.notes && (
                    <p
                      className="body-sm"
                      style={{
                        margin: 0,
                        color: 'var(--text-tertiary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {goal.notes}
                    </p>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingGoal ? 'Edit Goal' : 'New Goal'}
        onClose={handleCloseModal}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Title */}
          <div>
            <label className="form-label">Title</label>
            <input
              className="input"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What do you want to achieve?"
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Target Date */}
          <div>
            <label className="form-label">Target Date</label>
            <input
              className="input"
              type="date"
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="textarea"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional context or milestones..."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <Button className="btn btn-ghost btn-md" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              className="btn btn-primary btn-md"
              onClick={handleSubmit}
              disabled={!form.title.trim()}
            >
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
