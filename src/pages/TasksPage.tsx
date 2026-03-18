import { useState, useMemo } from 'react';
import { useStore, useActions } from '@/stores/store';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import {
  Plus,
  Trash2,
  Check,
  Circle,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  Edit3,
  X,
} from 'lucide-react';
import { format, isToday, isPast, subDays, isAfter, parseISO } from 'date-fns';

type FilterTab = 'today' | 'upcoming' | 'past-week' | 'backlog' | 'incomplete' | 'logbook';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past-week', label: 'Past Week' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'logbook', label: 'Logbook' },
];

const PRIORITY_BADGE_COLOR: Record<TaskPriority, string> = {
  urgent: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'default',
};

const TAG_BADGE_COLORS = ['purple', 'green', 'blue', 'pink', 'orange', 'yellow'] as const;

function getTagBadgeColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_BADGE_COLORS[Math.abs(hash) % TAG_BADGE_COLORS.length];
}

interface NewTaskForm {
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  tags: string;
  notes: string;
}

const EMPTY_FORM: NewTaskForm = {
  title: '',
  priority: 'medium',
  status: 'today',
  due_date: '',
  tags: '',
  notes: '',
};

export default function TasksPage({ filterOverride }: { filterOverride?: string }) {
  const tasks = useStore((s) => s.tasks);
  const { addTask, updateTask, deleteTask } = useActions();

  const [activeTab, setActiveTab] = useState<FilterTab>(
    filterOverride === 'backlog' ? 'backlog' : 'today'
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState<NewTaskForm>({ ...EMPTY_FORM });
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<(NewTaskForm & { id: string }) | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currentTab: FilterTab = filterOverride === 'backlog' ? 'backlog' : activeTab;

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = subDays(now, 7);

    return tasks
      .filter((task: Task) => {
        switch (currentTab) {
          case 'today':
            return task.status === 'today';
          case 'upcoming':
            return task.status === 'upcoming';
          case 'past-week': {
            if (!task.completed_at) return false;
            const completedDate = parseISO(task.completed_at);
            return isAfter(completedDate, oneWeekAgo);
          }
          case 'backlog':
            return task.status === 'backlog';
          case 'incomplete':
            return task.status !== 'done';
          case 'logbook':
            return task.status === 'done';
          default:
            return true;
        }
      })
      .sort((a: Task, b: Task) => {
        const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [tasks, currentTab]);

  function handleAddTask() {
    if (!newForm.title.trim()) return;
    const tags = newForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    addTask({
      title: newForm.title.trim(),
      priority: newForm.priority,
      status: newForm.status,
      due_date: newForm.due_date || null,
      tags,
      notes: newForm.notes,
    });
    setNewForm({ ...EMPTY_FORM });
    setShowAddModal(false);
  }

  function handleToggleComplete(task: Task) {
    if (task.status === 'done') {
      updateTask(task.id, { status: 'today', completed_at: null });
    } else {
      updateTask(task.id, { status: 'done', completed_at: new Date().toISOString() });
    }
  }

  function handleSaveEdit() {
    if (!editingTask || !editingTask.title.trim()) return;
    const tags = editingTask.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    updateTask(editingTask.id, {
      title: editingTask.title.trim(),
      priority: editingTask.priority,
      status: editingTask.status,
      due_date: editingTask.due_date || null,
      tags,
      notes: editingTask.notes,
    });
    setEditingTask(null);
    setExpandedTaskId(null);
  }

  function handleStartEdit(task: Task) {
    setEditingTask({
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ?? '',
      tags: task.tags.join(', '),
      notes: task.notes ?? '',
    });
    setExpandedTaskId(task.id);
  }

  function handleDelete(id: string) {
    deleteTask(id);
    setDeleteConfirmId(null);
    if (expandedTaskId === id) {
      setExpandedTaskId(null);
      setEditingTask(null);
    }
  }

  function formatDueDate(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return 'Today';
      return format(date, 'MMM d');
    } catch {
      return dateStr;
    }
  }

  function isDueOverdue(dateStr: string | null): boolean {
    if (!dateStr) return false;
    try {
      const date = parseISO(dateStr);
      return isPast(date) && !isToday(date);
    } catch {
      return false;
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="heading-xl" style={{ color: 'var(--text-primary)', margin: 0 }}>
            {filterOverride === 'backlog' ? 'Backlog' : 'Tasks'}
          </h1>
          <p className="body-sm" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn btn-primary btn-md"
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Filter Tab Bar */}
      {!filterOverride && (
        <div className="tab-bar" style={{ overflowX: 'auto' }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab${currentTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredTasks.length === 0 && (
          <div
            className="glass-card"
            style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <Circle size={44} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <p className="body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>No tasks here</p>
            <p className="body-xs" style={{ color: 'var(--text-tertiary)', margin: 0 }}>
              {currentTab === 'logbook'
                ? 'Completed tasks will appear here'
                : 'Click "Add Task" to create one'}
            </p>
          </div>
        )}

        {filteredTasks.map((task: Task) => {
          const isExpanded = expandedTaskId === task.id;
          const isEditing = editingTask?.id === task.id;
          const overdue = isDueOverdue(task.due_date);

          return (
            <div
              key={task.id}
              className="glass-card"
              style={{
                overflow: 'hidden',
                outline: isExpanded ? '1px solid var(--glass-border-strong, var(--glass-border))' : 'none',
              }}
            >
              {/* Main Task Row */}
              <div
                className="task-row"
                style={{ borderRadius: isExpanded ? '20px 20px 0 0' : undefined, cursor: 'pointer' }}
                onClick={() => {
                  if (isExpanded) {
                    setExpandedTaskId(null);
                    setEditingTask(null);
                  } else {
                    setExpandedTaskId(task.id);
                  }
                }}
              >
                {/* Expand Toggle */}
                <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </span>

                {/* Checkbox */}
                <button
                  className="checkbox"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(task);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: task.status === 'done' ? 'rgba(52,211,153,0.18)' : 'transparent',
                    borderColor: task.status === 'done' ? 'rgb(52,211,153)' : undefined,
                    color: 'rgb(52,211,153)',
                  }}
                  title={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
                >
                  {task.status === 'done' && <Check size={10} />}
                </button>

                {/* Priority Dot */}
                <span
                  className={`priority-dot priority-${task.priority}`}
                  style={{ flexShrink: 0 }}
                  title={task.priority}
                />

                {/* Title */}
                <span
                  className="body-sm"
                  style={{
                    flex: 1,
                    color: task.status === 'done' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  {task.title}
                </span>

                {/* Priority Badge */}
                <Badge color={PRIORITY_BADGE_COLOR[task.priority] as any}>
                  {task.priority}
                </Badge>

                {/* Due Date */}
                {task.due_date && (
                  <span
                    className="body-xs"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: overdue ? 'var(--accent-red)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={12} />
                    {formatDueDate(task.due_date)}
                  </span>
                )}

                {/* Tags (first 2) */}
                {task.tags.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {task.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} color={getTagBadgeColor(tag) as any}>
                        {tag}
                      </Badge>
                    ))}
                    {task.tags.length > 2 && (
                      <span className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
                        +{task.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Row Actions */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn-icon"
                    onClick={() => handleStartEdit(task)}
                    title="Edit"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => setDeleteConfirmId(task.id)}
                    title="Delete"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded Panel */}
              {isExpanded && (
                <div style={{ padding: '12px 14px 16px', borderTop: '1px solid var(--glass-border)' }}>
                  {isEditing ? (
                    /* Edit Form */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="form-label">Title</label>
                        <input
                          className="input"
                          style={{ width: '100%' }}
                          type="text"
                          value={editingTask.title}
                          onChange={(e) =>
                            setEditingTask((prev) => prev && { ...prev, title: e.target.value })
                          }
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                        <div>
                          <label className="form-label">Priority</label>
                          <select
                            className="input"
                            style={{ width: '100%' }}
                            value={editingTask.priority}
                            onChange={(e) =>
                              setEditingTask(
                                (prev) => prev && { ...prev, priority: e.target.value as TaskPriority }
                              )
                            }
                          >
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>

                        <div>
                          <label className="form-label">Status</label>
                          <select
                            className="input"
                            style={{ width: '100%' }}
                            value={editingTask.status}
                            onChange={(e) =>
                              setEditingTask(
                                (prev) => prev && { ...prev, status: e.target.value as TaskStatus }
                              )
                            }
                          >
                            <option value="today">Today</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="backlog">Backlog</option>
                            <option value="done">Done</option>
                          </select>
                        </div>

                        <div>
                          <label className="form-label">Due Date</label>
                          <input
                            className="input"
                            style={{ width: '100%' }}
                            type="date"
                            value={editingTask.due_date}
                            onChange={(e) =>
                              setEditingTask((prev) => prev && { ...prev, due_date: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <label className="form-label">Tags (comma-separated)</label>
                          <input
                            className="input"
                            style={{ width: '100%' }}
                            type="text"
                            placeholder="tag1, tag2"
                            value={editingTask.tags}
                            onChange={(e) =>
                              setEditingTask((prev) => prev && { ...prev, tags: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Notes</label>
                        <textarea
                          className="textarea"
                          style={{ width: '100%' }}
                          placeholder="Notes..."
                          value={editingTask.notes}
                          onChange={(e) =>
                            setEditingTask((prev) => prev && { ...prev, notes: e.target.value })
                          }
                          rows={3}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setEditingTask(null);
                            setExpandedTaskId(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveEdit}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Check size={14} />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Detail View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {task.tags.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Tag size={13} style={{ color: 'var(--text-tertiary)' }} />
                          {task.tags.map((tag) => (
                            <Badge key={tag} color={getTagBadgeColor(tag) as any}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {task.notes && (
                        <p className="body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                          {task.notes}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {task.created_at && (
                          <span className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Created {format(parseISO(task.created_at), 'MMM d, yyyy')}
                          </span>
                        )}
                        {task.completed_at && (
                          <span className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Completed {format(parseISO(task.completed_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStartEdit(task)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteConfirmId(task.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <Modal open={showAddModal} title="Add Task" onClose={() => { setShowAddModal(false); setNewForm({ ...EMPTY_FORM }); }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Title</label>
            <input
              className="input"
              style={{ width: '100%' }}
              type="text"
              placeholder="Task title..."
              value={newForm.title}
              onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Priority</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={newForm.priority}
                onChange={(e) => setNewForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={newForm.status}
                onChange={(e) => setNewForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="backlog">Backlog</option>
              </select>
            </div>

            <div>
              <label className="form-label">Due Date</label>
              <input
                className="input"
                style={{ width: '100%' }}
                type="date"
                value={newForm.due_date}
                onChange={(e) => setNewForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">Tags (comma-separated)</label>
              <input
                className="input"
                style={{ width: '100%' }}
                type="text"
                placeholder="tag1, tag2"
                value={newForm.tags}
                onChange={(e) => setNewForm((f) => ({ ...f, tags: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="textarea"
              style={{ width: '100%' }}
              placeholder="Notes (optional)..."
              value={newForm.notes}
              onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              className="btn btn-ghost btn-md"
              onClick={() => { setShowAddModal(false); setNewForm({ ...EMPTY_FORM }); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <X size={15} />
              Cancel
            </button>
            <button
              className="btn btn-primary btn-md"
              onClick={handleAddTask}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              Add Task
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        title="Delete Task"
        onClose={() => setDeleteConfirmId(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '8px 0' }}>
          <Trash2 size={40} style={{ color: 'var(--accent-red)' }} />
          <div>
            <h3 className="heading-md" style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Delete this task?
            </h3>
            <p className="body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              This action cannot be undone. The task will be permanently removed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-ghost btn-md"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger btn-md"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
