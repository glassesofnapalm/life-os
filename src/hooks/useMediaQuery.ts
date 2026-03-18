import { useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
  }
}

function getSnapshot(query: string) {
  return () => window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribe(query), getSnapshot(query), () => false)
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)')
}
