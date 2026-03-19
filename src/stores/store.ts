import { useSyncExternalStore, useCallback } from 'react'
import type {
  Task, Goal, LifeEvent, VisionBoardItem, CustomPage, Widget, WidgetType,
  CalendarEvent, Book, WeatherCity, MealPlan, MealDay, NoteFolder, Note,
} from '@/types'
import { v4 as uuid } from 'uuid'

interface AppState {
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  backgroundImage: string | null
  tasks: Task[]
  goals: Goal[]
  lifeEvents: LifeEvent[]
  visionBoardItems: VisionBoardItem[]
  calendarEvents: CalendarEvent[]
  customPages: CustomPage[]
  widgets: Widget[]
  books: Book[]
  weatherCities: WeatherCity[]
  mealPlan: MealPlan
  noteFolders: NoteFolder[]
  notes: Note[]
}

const WIDGET_TITLES: Record<WidgetType, string> = {
  'weather':             'Weather',
  'spotify':             'Now Playing',
  'tasks-today':         "Today's Tasks",
  'calendar-upcoming':   'Upcoming Events',
  'goals-progress':      'Goals Progress',
  'books':               'Reading List',
  'life-events-recent':  'Recent Milestones',
  'recipes':             'Meal Planner',
  'stats':               'Overview',
}

const defaultWidgets: Widget[] = [
  { id: '1', type: 'weather',            title: 'Weather',            order: 0, collapsed: false, visible: true  },
  { id: '2', type: 'tasks-today',        title: "Today's Tasks",      order: 1, collapsed: false, visible: true  },
  { id: '3', type: 'calendar-upcoming',  title: 'Upcoming Events',    order: 2, collapsed: false, visible: true  },
  { id: '4', type: 'spotify',            title: 'Now Playing',        order: 3, collapsed: false, visible: true  },
  { id: '5', type: 'books',             title: 'Reading List',        order: 4, collapsed: false, visible: true  },
  { id: '6', type: 'goals-progress',    title: 'Goals Progress',      order: 5, collapsed: false, visible: true  },
  { id: '7', type: 'life-events-recent',title: 'Recent Milestones',   order: 6, collapsed: false, visible: true  },
  { id: '8', type: 'stats',             title: 'Overview',            order: 7, collapsed: false, visible: false },
  { id: '9', type: 'recipes',           title: 'Meal Planner',        order: 8, collapsed: false, visible: true  },
]

const sampleTasks: Task[] = [
  { id: uuid(), title: 'Review project roadmap', priority: 'high', status: 'today', due_date: new Date().toISOString().split('T')[0], tags: ['work', 'planning'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 0 },
  { id: uuid(), title: 'Morning meditation', priority: 'medium', status: 'today', due_date: new Date().toISOString().split('T')[0], tags: ['health', 'routine'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 1 },
  { id: uuid(), title: 'Read 30 pages', priority: 'low', status: 'upcoming', due_date: null, tags: ['learning'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 2 },
  { id: uuid(), title: 'Plan weekend trip', priority: 'medium', status: 'backlog', due_date: null, tags: ['personal'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 3 },
  { id: uuid(), title: 'Update resume', priority: 'high', status: 'backlog', due_date: null, tags: ['career'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 4 },
]

const sampleGoals: Goal[] = [
  { id: uuid(), title: 'Run a marathon', category: 'Health', target_date: '2026-12-31', progress: 35, linked_task_ids: [], notes: 'Training plan in progress', parent_id: null, created_at: new Date().toISOString(), order: 0 },
  { id: uuid(), title: 'Learn Spanish to B2', category: 'Learning', target_date: '2027-06-01', progress: 20, linked_task_ids: [], notes: '', parent_id: null, created_at: new Date().toISOString(), order: 1 },
  { id: uuid(), title: 'Save $50k emergency fund', category: 'Finance', target_date: '2027-01-01', progress: 60, linked_task_ids: [], notes: '', parent_id: null, created_at: new Date().toISOString(), order: 2 },
]

const sampleLifeEvents: LifeEvent[] = [
  { id: uuid(), date: '2026-03-15', title: 'Started Life OS project', description: 'Began building my personal operating system.', mood: 'amazing', photo_url: null, created_at: new Date().toISOString() },
  { id: uuid(), date: '2026-02-14', title: 'Completed first 5K', description: 'Ran my first 5K in under 30 minutes!', mood: 'amazing', photo_url: null, created_at: new Date().toISOString() },
]

const initialState: AppState = {
  theme: 'dark',
  sidebarCollapsed: false,
  backgroundImage: null,
  tasks: sampleTasks,
  goals: sampleGoals,
  lifeEvents: sampleLifeEvents,
  visionBoardItems: [],
  calendarEvents: [],
  customPages: [],
  widgets: defaultWidgets,
  books: [],
  weatherCities: [],
  mealPlan: { calorieTarget: 2000, preferences: '', days: [] },
  noteFolders: [],
  notes: [],
}

// ── Persistence ────────────────────────────────────────────────
const STORAGE_KEY = 'lifeos_v5'
const BG_KEY = 'lifeos_bg'
let saveTimer: ReturnType<typeof setTimeout> | null = null

function schedSave(s: AppState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const { backgroundImage, ...rest } = s
      const serializable = {
        ...rest,
        calendarEvents: rest.calendarEvents.map(e => ({
          ...e,
          start: e.start instanceof Date ? e.start.toISOString() : e.start,
          end:   e.end   instanceof Date ? e.end.toISOString()   : e.end,
        })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
      if (backgroundImage) {
        try { localStorage.setItem(BG_KEY, backgroundImage) } catch { /* quota */ }
      } else {
        localStorage.removeItem(BG_KEY)
      }
    } catch { /* storage full */ }
  }, 400)
}

function loadSavedState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const bg  = localStorage.getItem(BG_KEY)

    if (!raw) return { ...initialState, backgroundImage: bg }

    const parsed = JSON.parse(raw) as Partial<AppState> & { calendarEvents?: any[] }

    // Restore Date objects in calendar events
    if (Array.isArray(parsed.calendarEvents)) {
      parsed.calendarEvents = parsed.calendarEvents.map((e: any) => ({
        ...e,
        start: e.start ? new Date(e.start) : new Date(),
        end:   e.end   ? new Date(e.end)   : new Date(),
      }))
    }

    // Migration: ensure widgets have visible field
    if (Array.isArray(parsed.widgets)) {
      parsed.widgets = parsed.widgets.map((w: any) => ({ visible: true, ...w }))
      // Add any new default widget types missing from stored state
      for (const dw of defaultWidgets) {
        const exists = parsed.widgets.some((w: any) => w.type === dw.type)
        if (!exists) {
          parsed.widgets.push({ ...dw, order: parsed.widgets.length, visible: false })
        }
      }
    }

    // Restore theme attribute on <html>
    if (parsed.theme) {
      document.documentElement.setAttribute('data-theme', parsed.theme)
    }

    return {
      ...initialState,
      ...(parsed as Partial<AppState>),
      // Ensure new fields always exist
      noteFolders: (parsed as any).noteFolders ?? [],
      notes:       (parsed as any).notes       ?? [],
      backgroundImage: bg,
    }
  } catch {
    return initialState
  }
}

// ── Store ──────────────────────────────────────────────────────
let state = loadSavedState()
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach(l => l())
  schedSave(state)
}

function getState() { return state }
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStore(): AppState
export function useStore<T>(selector: (s: AppState) => T): T
export function useStore<T>(selector?: (s: AppState) => T) {
  const select = selector || ((s: AppState) => s as unknown as T)
  return useSyncExternalStore(subscribe, () => select(getState()))
}

export function dispatch(updater: (s: AppState) => Partial<AppState>) {
  state = { ...state, ...updater(state) }
  emitChange()
}

// ── Action helpers ─────────────────────────────────────────────
export function setBackgroundImage(dataUrl: string | null) {
  dispatch(() => ({ backgroundImage: dataUrl }))
}

export function toggleTheme() {
  dispatch(s => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  })
}

export function toggleSidebar() {
  dispatch(s => ({ sidebarCollapsed: !s.sidebarCollapsed }))
}

// Tasks
export function addTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at' | 'order'>) {
  dispatch(s => ({
    tasks: [...s.tasks, { ...task, id: uuid(), created_at: new Date().toISOString(), completed_at: null, order: s.tasks.length }]
  }))
}

export function updateTask(id: string, updates: Partial<Task>) {
  dispatch(s => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates, completed_at: updates.status === 'done' ? new Date().toISOString() : t.completed_at } : t)
  }))
}

export function deleteTask(id: string) {
  dispatch(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
}

// Goals
export function addGoal(goal: Omit<Goal, 'id' | 'created_at' | 'order'>) {
  dispatch(s => ({
    goals: [...s.goals, { ...goal, id: uuid(), created_at: new Date().toISOString(), order: s.goals.length }]
  }))
}

export function updateGoal(id: string, updates: Partial<Goal>) {
  dispatch(s => ({ goals: s.goals.map(g => g.id === id ? { ...g, ...updates } : g) }))
}

export function deleteGoal(id: string) {
  dispatch(s => ({ goals: s.goals.filter(g => g.id !== id) }))
}

// Life Events
export function addLifeEvent(event: Omit<LifeEvent, 'id' | 'created_at'>) {
  dispatch(s => ({
    lifeEvents: [{ ...event, id: uuid(), created_at: new Date().toISOString() }, ...s.lifeEvents]
  }))
}

export function updateLifeEvent(id: string, updates: Partial<LifeEvent>) {
  dispatch(s => ({ lifeEvents: s.lifeEvents.map(e => e.id === id ? { ...e, ...updates } : e) }))
}

export function deleteLifeEvent(id: string) {
  dispatch(s => ({ lifeEvents: s.lifeEvents.filter(e => e.id !== id) }))
}

// Vision Board
export function addVisionBoardItem(item: Omit<VisionBoardItem, 'id'>) {
  dispatch(s => ({ visionBoardItems: [...s.visionBoardItems, { ...item, id: uuid() }] }))
}

export function updateVisionBoardItem(id: string, updates: Partial<VisionBoardItem>) {
  dispatch(s => ({ visionBoardItems: s.visionBoardItems.map(i => i.id === id ? { ...i, ...updates } : i) }))
}

export function deleteVisionBoardItem(id: string) {
  dispatch(s => ({ visionBoardItems: s.visionBoardItems.filter(i => i.id !== id) }))
}

// Custom Pages
export function addCustomPage(page: Omit<CustomPage, 'id' | 'created_at' | 'order'>): string {
  const id = uuid()
  dispatch(s => ({
    customPages: [...s.customPages, { ...page, id, created_at: new Date().toISOString(), order: s.customPages.length }]
  }))
  return id
}

export function updateCustomPage(id: string, updates: Partial<CustomPage>) {
  dispatch(s => ({ customPages: s.customPages.map(p => p.id === id ? { ...p, ...updates } : p) }))
}

export function deleteCustomPage(id: string) {
  dispatch(s => ({ customPages: s.customPages.filter(p => p.id !== id) }))
}

// Calendar Events
export function addCalendarEvent(event: Omit<CalendarEvent, 'id'>) {
  dispatch(s => ({ calendarEvents: [...s.calendarEvents, { ...event, id: uuid() }] }))
}

export function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>) {
  dispatch(s => ({ calendarEvents: s.calendarEvents.map(e => e.id === id ? { ...e, ...updates } : e) }))
}

export function deleteCalendarEvent(id: string) {
  dispatch(s => ({ calendarEvents: s.calendarEvents.filter(e => e.id !== id) }))
}

export function mergeExternalEvents(events: CalendarEvent[], source: 'outlook' | 'icloud') {
  dispatch(s => {
    const kept = s.calendarEvents.filter(e => e.source !== source)
    return { calendarEvents: [...kept, ...events] }
  })
}

export function clearExternalEvents(source: 'outlook' | 'icloud') {
  dispatch(s => ({ calendarEvents: s.calendarEvents.filter(e => e.source !== source) }))
}

// Books
export function addBook(book: Omit<Book, 'id' | 'created_at'>) {
  dispatch(s => ({ books: [...s.books, { ...book, id: uuid(), created_at: new Date().toISOString() }] }))
}

export function updateBook(id: string, updates: Partial<Book>) {
  dispatch(s => ({ books: s.books.map(b => b.id === id ? { ...b, ...updates } : b) }))
}

export function deleteBook(id: string) {
  dispatch(s => ({ books: s.books.filter(b => b.id !== id) }))
}

// Widgets
export function reorderWidgets(widgets: Widget[]) {
  dispatch(() => ({ widgets }))
}

export function toggleWidgetCollapsed(id: string) {
  dispatch(s => ({
    widgets: s.widgets.map(w => w.id === id ? { ...w, collapsed: !w.collapsed } : w)
  }))
}

export function toggleWidgetVisible(id: string) {
  dispatch(s => ({
    widgets: s.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
  }))
}

export function resizeWidget(id: string, span: 1 | 2) {
  dispatch(s => ({
    widgets: s.widgets.map(w => w.id === id ? { ...w, span } : w)
  }))
}

export function addWidget(type: WidgetType) {
  // If it already exists, just make it visible
  const existing = state.widgets.find(w => w.type === type)
  if (existing) {
    dispatch(s => ({
      widgets: s.widgets.map(w => w.id === existing.id ? { ...w, visible: true } : w)
    }))
    return
  }
  const nextOrder = state.widgets.filter(w => w.visible).length
  dispatch(s => ({
    widgets: [...s.widgets, {
      id: uuid(),
      type,
      title: WIDGET_TITLES[type],
      order: nextOrder,
      collapsed: false,
      visible: true,
    }]
  }))
}

// Weather Cities
export function addWeatherCity(city: WeatherCity) {
  dispatch(s => ({ weatherCities: [...s.weatherCities, city] }))
}

export function removeWeatherCity(id: string) {
  dispatch(s => ({ weatherCities: s.weatherCities.filter(c => c.id !== id) }))
}

// Note Folders
export function addNoteFolder(name: string, icon = '📁', color = 'var(--accent-blue)') {
  dispatch(s => ({
    noteFolders: [...s.noteFolders, { id: uuid(), name, icon, color, order: s.noteFolders.length, created_at: new Date().toISOString() }]
  }))
}

export function updateNoteFolder(id: string, updates: Partial<NoteFolder>) {
  dispatch(s => ({ noteFolders: s.noteFolders.map(f => f.id === id ? { ...f, ...updates } : f) }))
}

export function deleteNoteFolder(id: string) {
  dispatch(s => ({
    noteFolders: s.noteFolders.filter(f => f.id !== id),
    notes: s.notes.filter(n => n.folder_id !== id),
  }))
}

// Notes
export function addNote(folder_id: string, title = 'Untitled'): string {
  const id = uuid()
  const now = new Date().toISOString()
  dispatch(s => ({
    notes: [...s.notes, { id, folder_id, title, content: '', created_at: now, updated_at: now, pinned: false }]
  }))
  return id
}

export function updateNote(id: string, updates: Partial<Note>) {
  dispatch(s => ({
    notes: s.notes.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)
  }))
}

export function deleteNote(id: string) {
  dispatch(s => ({ notes: s.notes.filter(n => n.id !== id) }))
}

// Meal Plan
export function updateMealPlan(updates: Partial<MealPlan>) {
  dispatch(s => ({ mealPlan: { ...s.mealPlan, ...updates } }))
}

export function setMealDay(day: MealDay) {
  dispatch(s => {
    const days = s.mealPlan.days.filter(d => d.date !== day.date)
    return { mealPlan: { ...s.mealPlan, days: [...days, day].sort((a, b) => a.date.localeCompare(b.date)) } }
  })
}

export function useActions() {
  return {
    toggleTheme:            useCallback(toggleTheme, []),
    toggleSidebar:          useCallback(toggleSidebar, []),
    addTask:                useCallback(addTask, []),
    updateTask:             useCallback(updateTask, []),
    deleteTask:             useCallback(deleteTask, []),
    addGoal:                useCallback(addGoal, []),
    updateGoal:             useCallback(updateGoal, []),
    deleteGoal:             useCallback(deleteGoal, []),
    addLifeEvent:           useCallback(addLifeEvent, []),
    updateLifeEvent:        useCallback(updateLifeEvent, []),
    deleteLifeEvent:        useCallback(deleteLifeEvent, []),
    addVisionBoardItem:     useCallback(addVisionBoardItem, []),
    updateVisionBoardItem:  useCallback(updateVisionBoardItem, []),
    deleteVisionBoardItem:  useCallback(deleteVisionBoardItem, []),
    addCustomPage:          useCallback(addCustomPage, []),
    updateCustomPage:       useCallback(updateCustomPage, []),
    deleteCustomPage:       useCallback(deleteCustomPage, []),
    addCalendarEvent:       useCallback(addCalendarEvent, []),
    updateCalendarEvent:    useCallback(updateCalendarEvent, []),
    deleteCalendarEvent:    useCallback(deleteCalendarEvent, []),
    mergeExternalEvents:    useCallback(mergeExternalEvents, []),
    clearExternalEvents:    useCallback(clearExternalEvents, []),
    reorderWidgets:         useCallback(reorderWidgets, []),
    toggleWidgetCollapsed:  useCallback(toggleWidgetCollapsed, []),
    toggleWidgetVisible:    useCallback(toggleWidgetVisible, []),
    addWidget:              useCallback(addWidget, []),
    resizeWidget:           useCallback(resizeWidget, []),
    addNoteFolder:          useCallback(addNoteFolder, []),
    updateNoteFolder:       useCallback(updateNoteFolder, []),
    deleteNoteFolder:       useCallback(deleteNoteFolder, []),
    addNote:                useCallback(addNote, []),
    updateNote:             useCallback(updateNote, []),
    deleteNote:             useCallback(deleteNote, []),
    setBackgroundImage:     useCallback(setBackgroundImage, []),
    addBook:                useCallback(addBook, []),
    updateBook:             useCallback(updateBook, []),
    deleteBook:             useCallback(deleteBook, []),
    addWeatherCity:         useCallback(addWeatherCity, []),
    removeWeatherCity:      useCallback(removeWeatherCity, []),
    updateMealPlan:         useCallback(updateMealPlan, []),
    setMealDay:             useCallback(setMealDay, []),
  }
}
