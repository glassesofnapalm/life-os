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

export type WidgetType =
  | 'tasks-today'
  | 'calendar-upcoming'
  | 'goals-progress'
  | 'life-events-recent'
  | 'spotify'
  | 'books'
  | 'weather'
  | 'recipes'
  | 'stats'
  | 'daily-briefing'
  | 'habits-today';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  order: number;
  collapsed: boolean;
  visible: boolean;
  span?: 1 | 2; // grid column span
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

export interface WeatherCity {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export interface Recipe {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients: string[];
  instructions: string;
  prepTime?: number;
  servings?: number;
}

export interface MealDay {
  date: string; // YYYY-MM-DD
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe;
  snack?: Recipe;
}

export interface MealPlan {
  calorieTarget: number;
  preferences: string;
  days: MealDay[];
}

export interface NoteFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  created_at: string;
}

export interface Note {
  id: string;
  folder_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
}

// ── Habit Tracker ────────────────────────────────────
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'weekly';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string; // accent CSS var name, e.g. 'green'
  frequency: HabitFrequency;
  created_at: string;
  order: number;
  archived: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

// ── Journal ─────────────────────────────────────────
export type JournalMood = 'amazing' | 'good' | 'neutral' | 'low' | 'difficult';

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood: JournalMood | null;
  created_at: string;
  updated_at: string;
}

// ── Focus Timer ──────────────────────────────────────
export interface FocusSession {
  id: string;
  started_at: string;
  duration_min: number; // planned
  completed: boolean;
  task_label: string;
}
