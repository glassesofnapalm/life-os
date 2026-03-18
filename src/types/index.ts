export type TaskStatus = 'today' | 'upcoming' | 'backlog' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  tags: string[];
  created_at: string;
  completed_at: string | null;
  notes: string;
  order: number;
  page_id?: string;
}

export interface Goal {
  id: string;
  title: string;
  category: string;
  target_date: string | null;
  progress: number;
  linked_task_ids: string[];
  notes: string;
  parent_id: string | null;
  created_at: string;
  order: number;
}

export interface LifeEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  mood: 'amazing' | 'good' | 'neutral' | 'tough' | 'difficult';
  photo_url: string | null;
  created_at: string;
}

export interface VisionBoardItem {
  id: string;
  type: 'image' | 'text';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  board_id: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  source: 'outlook' | 'icloud' | 'local';
  color?: string;
  description?: string;
  location?: string;
}

export interface CustomPage {
  id: string;
  title: string;
  icon: string;
  content: string;
  template: 'blank' | 'notes' | 'database' | 'kanban' | 'tasks';
  pinned: boolean;
  created_at: string;
  order: number;
}

export type CalendarView = 'day' | 'week' | 'month';

export interface Widget {
  id: string;
  type: 'tasks-today' | 'calendar-upcoming' | 'goals-progress' | 'life-events-recent' | 'quick-note' | 'spotify' | 'books' | 'weather';
  title: string;
  order: number;
  collapsed: boolean;
}

export type BookStatus = 'reading' | 'finished' | 'want-to-read';

export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  status: BookStatus;
  progress: number; // 0–100
  notes?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}
