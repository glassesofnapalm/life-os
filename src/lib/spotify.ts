/**
 * Spotify Web API integration using PKCE authorization flow.
 *
 * Setup:
 *  1. Go to https://developer.spotify.com/dashboard and create an app.
 *  2. Add your site URL + "/spotify-callback" as a Redirect URI.
 *     - For local dev: http://localhost:5173/spotify-callback  (Spotify allows http for localhost)
 *     - For Vercel:    https://your-app.vercel.app/spotify-callback
 *  3. Paste your Client ID into Settings > Spotify.
 *  4. Playback controls (play/pause/skip) require a Spotify Premium account.
 */

const CLIENT_ID_KEY  = 'spotify_client_id'
const TOKEN_KEY      = 'spotify_access_token'
const EXPIRY_KEY     = 'spotify_token_expiry'
const REFRESH_KEY    = 'spotify_refresh_token'
const VERIFIER_KEY   = 'spotify_code_verifier'
const DEPLOY_URL_KEY = 'lifeos_deploy_url'

const SCOPES = [
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ')

// ── Deployment config ──────────────────────────────────────────
export function getDeployUrl(): string {
  return localStorage.getItem(DEPLOY_URL_KEY)?.replace(/\/$/, '') || window.location.origin
}
export function setDeployUrl(url: string) {
  localStorage.setItem(DEPLOY_URL_KEY, url.replace(/\/$/, ''))
}
export function clearDeployUrl() {
  localStorage.removeItem(DEPLOY_URL_KEY)
}
export function getSpotifyRedirectUri(): string {
  return `${getDeployUrl()}/spotify-callback`
}

// ── Config ─────────────────────────────────────────────────────
export function getSpotifyClientId(): string | null {
  return localStorage.getItem(CLIENT_ID_KEY)
}
export function setSpotifyClientId(id: string) {
  localStorage.setItem(CLIENT_ID_KEY, id)
}
export function isSpotifyConnected(): boolean {
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (!expiry) return false
  // If token expires within 5 minutes, treat as disconnected (will auto-refresh)
  return Date.now() < parseInt(expiry) - 300_000
}
export function getSpotifyToken(): string | null {
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (!expiry || Date.now() >= parseInt(expiry)) return null
  return localStorage.getItem(TOKEN_KEY)
}
export function clearSpotifyAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(VERIFIER_KEY)
}

// ── PKCE helpers ───────────────────────────────────────────────
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}
async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
}
function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── OAuth flow ─────────────────────────────────────────────────
export async function initiateSpotifyAuth(): Promise<void> {
  const clientId = getSpotifyClientId()
  if (!clientId) throw new Error('No Spotify Client ID configured')

  const verifier   = generateRandomString(64)
  const challenge  = base64url(await sha256(verifier))
  localStorage.setItem(VERIFIER_KEY, verifier)

  const params = new URLSearchParams({
    client_id:             clientId,
    response_type:         'code',
    redirect_uri:          getSpotifyRedirectUri(),
    scope:                 SCOPES,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeSpotifyCode(code: string): Promise<void> {
  const clientId = getSpotifyClientId()
  const verifier  = localStorage.getItem(VERIFIER_KEY)
  if (!clientId || !verifier) throw new Error('Missing OAuth state')

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  getSpotifyRedirectUri(),
      code_verifier: verifier,
    }),
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Token exchange failed (${resp.status}): ${txt}`)
  }

  const data = await resp.json()
  localStorage.setItem(TOKEN_KEY,  data.access_token)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000))
  if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
  localStorage.removeItem(VERIFIER_KEY)
}

export async function refreshSpotifyToken(): Promise<boolean> {
  const clientId     = getSpotifyClientId()
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!clientId || !refreshToken) return false

  try {
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!resp.ok) return false
    const data = await resp.json()
    localStorage.setItem(TOKEN_KEY,  data.access_token)
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000))
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
    return true
  } catch {
    return false
  }
}

// ── API types ──────────────────────────────────────────────────
export interface SpotifyTrack {
  id: string
  name: string
  artists: string
  album: string
  albumArt?: string
  isPlaying: boolean
  progressMs?: number
  durationMs?: number
}

// ── API fetch helper (with auto-refresh) ───────────────────────
async function spotifyFetch(path: string, options?: RequestInit): Promise<Response | null> {
  let token = getSpotifyToken()
  if (!token) {
    const ok = await refreshSpotifyToken()
    if (!ok) return null
    token = getSpotifyToken()
    if (!token) return null
  }
  return fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  })
}

// ── Read API ───────────────────────────────────────────────────
export async function getCurrentlyPlaying(): Promise<SpotifyTrack | null> {
  const resp = await spotifyFetch('/me/player/currently-playing')
  if (!resp || resp.status === 204 || resp.status === 404) return null
  if (!resp.ok) return null
  const data = await resp.json()
  if (!data?.item) return null
  return {
    id:          data.item.id,
    name:        data.item.name,
    artists:     data.item.artists.map((a: any) => a.name).join(', '),
    album:       data.item.album.name,
    albumArt:    data.item.album.images?.[0]?.url,
    isPlaying:   data.is_playing,
    progressMs:  data.progress_ms,
    durationMs:  data.item.duration_ms,
  }
}

export async function getRecentlyPlayed(limit = 4): Promise<SpotifyTrack[]> {
  const resp = await spotifyFetch(`/me/player/recently-played?limit=${limit}`)
  if (!resp || !resp.ok) return []
  const data = await resp.json()
  return (data.items ?? []).map((item: any) => ({
    id:        item.track.id,
    name:      item.track.name,
    artists:   item.track.artists.map((a: any) => a.name).join(', '),
    album:     item.track.album.name,
    albumArt:  item.track.album.images?.[0]?.url,
    isPlaying: false,
  }))
}

// ── Playback controls (Spotify Premium required) ───────────────
export async function spotifyPlay(): Promise<{ ok: boolean; needsPremium?: boolean }> {
  const resp = await spotifyFetch('/me/player/play', { method: 'PUT' })
  if (!resp) return { ok: false }
  if (resp.status === 403) return { ok: false, needsPremium: true }
  return { ok: resp.ok || resp.status === 204 }
}

export async function spotifyPause(): Promise<{ ok: boolean; needsPremium?: boolean }> {
  const resp = await spotifyFetch('/me/player/pause', { method: 'PUT' })
  if (!resp) return { ok: false }
  if (resp.status === 403) return { ok: false, needsPremium: true }
  return { ok: resp.ok || resp.status === 204 }
}

export async function spotifyNext(): Promise<{ ok: boolean; needsPremium?: boolean }> {
  const resp = await spotifyFetch('/me/player/next', { method: 'POST' })
  if (!resp) return { ok: false }
  if (resp.status === 403) return { ok: false, needsPremium: true }
  return { ok: resp.ok || resp.status === 204 }
}

export async function spotifyPrev(): Promise<{ ok: boolean; needsPremium?: boolean }> {
  const resp = await spotifyFetch('/me/player/previous', { method: 'POST' })
  if (!resp) return { ok: false }
  if (resp.status === 403) return { ok: false, needsPremium: true }
  return { ok: resp.ok || resp.status === 204 }
}
