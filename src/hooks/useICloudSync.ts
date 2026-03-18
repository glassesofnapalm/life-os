import { useEffect, useRef, useCallback, useState } from 'react'
import {
  fetchIcsUrl,
  cacheICloudEvents,
  getCachedICloudEvents,
  getICloudSubscriptionUrl,
  getICloudLastSync,
  setICloudLastSync,
} from '@/lib/ical'
import { mergeExternalEvents } from '@/stores/store'

const POLL_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export interface ICloudSyncState {
  syncing: boolean
  lastSync: Date | null
  error: string | null
  sync: () => Promise<void>
}

export function useICloudSync(): ICloudSyncState {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSyncState] = useState<Date | null>(() => getICloudLastSync())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sync = useCallback(async () => {
    const url = getICloudSubscriptionUrl()
    if (!url) return

    setSyncing(true)
    setError(null)
    try {
      const events = await fetchIcsUrl(url, 'icloud')
      cacheICloudEvents(events)
      mergeExternalEvents(events, 'icloud')
      const now = new Date()
      setICloudLastSync(now)
      setLastSyncState(now)
    } catch (err: any) {
      setError(err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    const url = getICloudSubscriptionUrl()
    if (!url) return

    // Load cached events immediately (no network)
    const cached = getCachedICloudEvents()
    if (cached.length > 0) {
      mergeExternalEvents(cached, 'icloud')
    }

    // Then do a live sync
    sync()

    // Poll every 15 minutes
    timerRef.current = setInterval(sync, POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sync])

  return { syncing, lastSync, error, sync }
}
