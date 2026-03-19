import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import CalendarPage from '@/pages/CalendarPage'
import TasksPage from '@/pages/TasksPage'
import GoalsPage from '@/pages/GoalsPage'
import { LifeEventsPage } from '@/pages/LifeEventsPage'
import { VisionBoardPage } from '@/pages/VisionBoardPage'
import { NewPagePage } from '@/pages/NewPagePage'
import { CustomPageView } from '@/pages/CustomPageView'
import SettingsPage from '@/pages/SettingsPage'
import SpotifyCallbackPage from '@/pages/SpotifyCallbackPage'
import RecipesPage from '@/pages/RecipesPage'
import NotesPage from '@/pages/NotesPage'
import HabitTrackerPage from '@/pages/HabitTrackerPage'
import JournalPage from '@/pages/JournalPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Spotify OAuth callback — outside AppLayout so it has no sidebar */}
        <Route path="/spotify-callback" element={<SpotifyCallbackPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/backlog" element={<TasksPage filterOverride="backlog" />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/life-events" element={<LifeEventsPage />} />
          <Route path="/vision-board" element={<VisionBoardPage />} />
          <Route path="/new-page" element={<NewPagePage />} />
          <Route path="/page/:id" element={<CustomPageView />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/habits" element={<HabitTrackerPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
