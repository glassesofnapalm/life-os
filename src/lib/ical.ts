/**
 * iCalendar (.ics) import for iCloud and other calendar services.
 *
 * Supports:
 *  - Importing .ics files directly (file picker)
 *  - Parsing iCalendar format into CalendarEvent[]
 *
 * To get an iCloud calendar URL:
 *  1. Open Calendar on Mac
 *  2. Right-click calendar → Share Calendar → check "Public Calendar"
 *  3. Copy the webcal:// URL (change webcal:// to https://)
 */
import ICAL from 'ical.js'
import type { CalendarEvent } from '@/types'

export function parseIcsString(icsData: string, source: 'icloud' | 'local' = 'icloud'): CalendarEvent[] {
  const jcalData = ICAL.parse(icsData)
  const comp = new ICAL.Component(jcalData)
  const vevents = comp.getAllSubcomponents('vevent')

  const events: CalendarEvent[] = []

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent)

    const startDate = event.startDate
    const endDate = event.endDate

    if (!startDate) continue

    const start = startDate.toJSDate()
    const end = endDate ? endDate.toJSDate() : start

    // Detect all-day: DATE type (no time component)
    const allDay = startDate.isDate

    events.push({
      id: `ical-${event.uid || Math.random().toString(36).slice(2)}`,
      title: event.summary || '(No title)',
      start,
      end,
      allDay,
      source,
      location: event.location || undefined,
      description: event.description || undefined,
    })
  }

  return events
}

export async function parseIcsFile(file: File, source: 'icloud' | 'local' = 'icloud'): Promise<CalendarEvent[]> {
  const text = await file.text()
  return parseIcsString(text, source)
}

/**
 * Fetch a public .ics calendar URL via the Vite dev-server proxy
 * (avoids CORS restrictions from iCloud / CalDAV servers).
 */
export async function fetchIcsUrl(url: string, source: 'icloud' | 'local' = 'icloud'): Promise<CalendarEvent[]> {
  // Route through our proxy so CORS is bypassed
  const proxyUrl = `/ical-proxy?url=${encodeURIComponent(url)}`
  const resp = await fetch(proxyUrl)
  if (!resp.ok) {
    throw new Error(`Failed to fetch calendar (${resp.status})`)
  }
  const text = await resp.text()
  return parseIcsString(text, source)
}

// ── Persistence ─────────────────────────────────────────────

const ICLOUD_STORAGE_KEY    = 'icloud_events_cache'
const ICLOUD_URL_KEY        = 'icloud_subscription_url'
const ICLOUD_LAST_SYNC_KEY  = 'icloud_last_sync'

export function getICloudSubscriptionUrl(): string | null {
  return localStorage.getItem(ICLOUD_URL_KEY)
}

export function setICloudSubscriptionUrl(url: string) {
  localStorage.setItem(ICLOUD_URL_KEY, url)
}

export function clearICloudSubscriptionUrl() {
  localStorage.removeItem(ICLOUD_URL_KEY)
}

export function getICloudLastSync(): Date | null {
  const raw = localStorage.getItem(ICLOUD_LAST_SYNC_KEY)
  return raw ? new Date(raw) : null
}

export function setICloudLastSync(d: Date = new Date()) {
  localStorage.setItem(ICLOUD_LAST_SYNC_KEY, d.toISOString())
}

export function clearICloudSyncMeta() {
  localStorage.removeItem(ICLOUD_URL_KEY)
  localStorage.removeItem(ICLOUD_LAST_SYNC_KEY)
}

export function getCachedICloudEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(ICLOUD_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    // Reconstruct Date objects from ISO strings
    return parsed.map((ev: any) => ({
      ...ev,
      start: new Date(ev.start),
      end: new Date(ev.end),
    }))
  } catch {
    return []
  }
}

export function cacheICloudEvents(events: CalendarEvent[]) {
  localStorage.setItem(ICLOUD_STORAGE_KEY, JSON.stringify(events))
}

export function clearICloudCache() {
  localStorage.removeItem(ICLOUD_STORAGE_KEY)
}
