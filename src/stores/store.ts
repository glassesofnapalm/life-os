import { useSyncExternalStore, useCallback } from 'react'
import type { Task, Goal, LifeEvent, VisionBoardItem, CustomPage, Widget, CalendarEvent, Book } from '@/types'
import { v4 as uuid } from 'uuid'

interface AppState {
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  backgroundImage: string | null   // data URL or null (uses solid color)
  tasks: Task[]
  goals: Goal[]
  lifeEvents: LifeEvent[]
  visionBoardItems: VisionBoardItem[]
  calendarEvents: CalendarEvent[]
  customPages: CustomPage[]
  widgets: Widget[]
  books: Book[]
}

const defaultWidgets: Widget[] = [
  { id: '1', type: 'weather', title: 'Weather', order: 0, collapsed: false },
  { id: '2', type: 'tasks-today', title: "Today's Tasks", order: 1, collapsed: false },
  { id: '3', type: 'calendar-upcoming', title: 'Upcoming Events', order: 2, collapsed: false },
  { id: '4', type: 'spotify', title: 'Now Playing', order: 3, collapsed: false },
  { id: '5', type: 'books', title: 'Reading List', order: 4, collapsed: false },
  { id: '6', type: 'goals-progress', title: 'Goals Progress', order: 5, collapsed: false },
  { id: '7', type: 'life-events-recent', title: 'Recent Milestones', order: 6, collapsed: false },
]

const sampleTasks: Task[] = [
  { id: uuid(), title: 'Review project roadmap', priority: 'high', status: 'today', due_date: new Date().toISOString().split('T')[0], tags: ['work', 'planning'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 0 },
  { id: uuid(), title: 'Morning meditation', priority: 'medium', status: 'today', due_date: new Date().toISOString().split('T')[0], tags: ['health', 'routine'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 1 },
  { id: uuid(), title: 'Read 30 pages', priority: 'low', status: 'upcoming', due_date: null, tags: ['learning'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 2 },
  { id: uuid(), title: 'Plan weekend trip', priority: 'medium', status: 'backlog', due_date: null, tags: ['personal'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 3 },
  { id: uuid(), title: 'Update resume', priority: 'high', status: 'backlog', due_date: null, tags: ['career'], created_at: new Date().toISOString(), completed_at: null, notes: '', order: 4 },
  { id: uuid(), title: 'Completed onboarding docs', priority: 'medium', status: 'done', due_date: null, tags: ['work'], created_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date().toISOString(), notes: '', order: 5 },
]

const sampleGoals: Goal[] = [
  { id: uuid(), title: 'Run a marathon', category: 'Health', target_date: '2026-12-31', progress: 35, linked_task_ids: [], notes: 'Training plan in progress', parent_id: null, created_at: new Date().toISOString(), order: 0 },
  { id: uuid(), title: 'Learn Spanish to B2', category: 'Learning', target_date: '2027-06-01', progress: 20, linked_task_ids: [], notes: '', parent_id: null, created_at: new Date().toISOString(), order: 1 },
  { id: uuid(), title: 'Save $50k emergency fund', category: 'Finance', target_date: '2027-01-01', progress: 60, linked_task_ids: [], notes: '', parent_id: null, created_at: new Date().toISOString(), order: 2 },
]

const sampleLifeEvents: LifeEvent[] = [
  { id: uuid(), date: '2026-03-15', title: 'Started Life OS project', description: 'Began building my personal operating system to track goals and life.', mood: 'amazing', photo_url: null, created_at: new Date().toISOString() },
  { id: uuid(), date: '2026-02-14', title: 'Completed first 5K', description: 'Ran my first 5K race in under 30 minutes!', mood: 'amazing', photo_url: null, created_at: new Date().toISOString() },
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
}

let state = { ...initialState }
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach(l => l())
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

// Action helpers
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

export function addGoal(goal: Omit<Goal, 'id' | 'created_at' | 'order'>) {
  dispatch(s => ({
    goals: [...s.goals, { ...goal, id: uuid(), created_at: new Date().toISOString(), order: s.goals.length }]
  }))
}

export function updateGoal(id: string, updates: Partial<Goal>) {
  dispatch(s => ({
    goals: s.goals.map(g => g.id === id ? { ...g, ...updates } : g)
  }))
}

export function deleteGoal(id: string) {
  dispatch(s => ({ goals: s.goals.filter(g => g.id !== id) }))
}

export function addLifeEvent(event: Omit<LifeEvent, 'id' | 'created_at'>) {
  dispatch(s => ({
    lifeEvents: [{ ...event, id: uuid(), created_at: new Date().toISOString() }, ...s.lifeEvents]
  }))
}

export function updateLifeEvent(id: string, updates: Partial<LifeEvent>) {
  dispatch(s => ({
    lifeEvents: s.lifeEvents.map(e => e.id === id ? { ...e, ...updates } : e)
  }))
}

export function deleteLifeEvent(id: string) {
  dispatch(s => ({ lifeEvents: s.lifeEvents.filter(e => e.id !== id) }))
}

export function addVisionBoardItem(item: Omit<VisionBoardItem, 'id'>) {
  dispatch(s => ({
    visionBoardItems: [...s.visionBoardItems, { ...item, id: uuid() }]
  }))
}

export function updateVisionBoardItem(id: string, updates: Partial<VisionBoardItem>) {
  dispatch(s => ({
    visionBoardItems: s.visionBoardItems.map(i => i.id === id ? { ...i, ...updates } : i)
  }))
}

export function deleteVisionBoardItem(id: string) {
  dispatch(s => ({ visionBoardItems: s.visionBoardItems.filter(i => i.id !== id) }))
}

export function addCustomPage(page: Omit<CustomPage, 'id' | 'created_at' | 'order'>): string {
  const id = uuid()
  dispatch(s => ({
    customPages: [...s.customPages, { ...page, id, created_at: new Date().toISOString(), order: s.customPages.length }]
  }))
  return id
}

export function updateCustomPage(id: string, updates: Partial<CustomPage>) {
  dispatch(s => ({
    customPages: s.customPages.map(p => p.id === id ? { ...p, ...updates } : p)
  }))
}

export function deleteCustomPage(id: string) {
  dispatch(s => ({ customPages: s.customPages.filter(p => p.id !== id) }))
}

export function addCalendarEvent(event: Omit<CalendarEvent, 'id'>) {
  dispatch(s => ({
    calendarEvents: [...s.calendarEvents, { ...event, id: uuid() }]
  }))
}

export function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>) {
  dispatch(s => ({
    calendarEvents: s.calendarEvents.map(e => e.id === id ? { ...e, ...updates } : e)
  }))
}

export function deleteCalendarEvent(id: string) {
  dispatch(s => ({ calendarEvents: s.calendarEvents.filter(e => e.id !== id) }))
}

export function mergeExternalEvents(events: CalendarEvent[], source: 'outlook' | 'icloud') {
  dispatch(s => {
    // Remove old events from this source, keep local + other source
    const kept = s.calendarEvents.filter(e => e.source !== source)
    return { calendarEvents: [...kept, ...events] }
  })
}

export function clearExternalEvents(source: 'outlook' | 'icloud') {
  dispatch(s => ({
    calendarEvents: s.calendarEvents.filter(e => e.source !== source)
  }))
}

export function addBook(book: Omit<Book, 'id' | 'created_at'>) {
  dispatch(s => ({
    books: [...s.books, { ...book, id: uuid(), created_at: new Date().toISOString() }]
  }))
}

export function updateBook(id: string, updates: Partial<Book>) {
  dispatch(s => ({
    books: s.books.map(b => b.id === id ? { ...b, ...updates } : b)
  }))
}

export function deleteBook(id: string) {
  dispatch(s => ({ books: s.books.filter(b => b.id !== id) }))
}

export function reorderWidgets(widgets: Widget[]) {
  dispatch(() => ({ widgets }))
}

export function toggleWidgetCollapsed(id: string) {
  dispatch(s => ({
    widgets: s.widgets.map(w => w.id === id ? { ...w, collapsed: !w.collapsed } : w)
  }))
}

export function useActions() {
  return {
    toggleTheme: useCallback(toggleTheme, []),
    toggleSidebar: useCallback(toggleSidebar, []),
    addTask: useCallback(addTask, []),
    updateTask: useCallback(updateTask, []),
    deleteTask: useCallback(deleteTask, []),
    addGoal: useCallback(addGoal, []),
    updateGoal: useCallback(updateGoal, []),
    deleteGoal: useCallback(deleteGoal, []),
    addLifeEvent: useCallback(addLifeEvent, []),
    updateLifeEvent: useCallback(updateLifeEvent, []),
    deleteLifeEvent: useCallback(deleteLifeEvent, []),
    addVisionBoardItem: useCallback(addVisionBoardItem, []),
    updateVisionBoardItem: useCallback(updateVisionBoardItem, []),
    deleteVisionBoardItem: useCallback(deleteVisionBoardItem, []),
    addCustomPage: useCallback(addCustomPage, []),
    updateCustomPage: useCallback(updateCustomPage, []),
    deleteCustomPage: useCallback(deleteCustomPage, []),
    addCalendarEvent: useCallback(addCalendarEvent, []),
    updateCalendarEvent: useCallback(updateCalendarEvent, []),
    deleteCalendarEvent: useCallback(deleteCalendarEvent, []),
    mergeExternalEvents: useCallback(mergeExternalEvents, []),
    clearExternalEvents: useCallback(clearExternalEvents, []),
    reorderWidgets: useCallback(reorderWidgets, []),
    toggleWidgetCollapsed: useCallback(toggleWidgetCollapsed, []),
    setBackgroundImage: useCallback(setBackgroundImage, []),
    addBook: useCallback(addBook, []),
    updateBook: useCallback(updateBook, []),
    deleteBook: useCallback(deleteBook, []),
  }
}
