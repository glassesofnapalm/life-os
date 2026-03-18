/**
 * Outlook Calendar integration via MSAL + Microsoft Graph.
 *
 * To use:
 *  1. Register an app at https://portal.azure.com → App registrations
 *  2. Add redirect URI: http://localhost:5173 (SPA)
 *  3. Under "API permissions" add Microsoft Graph → Calendars.Read (delegated)
 *  4. Copy the Application (client) ID and paste it in Settings → Calendar Connections
 */
import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser'
import type { CalendarEvent } from '@/types'

const SCOPES = ['Calendars.Read']

let msalInstance: PublicClientApplication | null = null
let currentAccount: AccountInfo | null = null

export function isOutlookConfigured(): boolean {
  return !!getClientId()
}

export function isOutlookConnected(): boolean {
  return currentAccount !== null
}

export function getOutlookAccount(): AccountInfo | null {
  return currentAccount
}

function getClientId(): string | null {
  return localStorage.getItem('outlook_client_id')
}

export function setOutlookClientId(clientId: string) {
  localStorage.setItem('outlook_client_id', clientId)
  msalInstance = null
  currentAccount = null
}

export function clearOutlookConnection() {
  localStorage.removeItem('outlook_client_id')
  msalInstance = null
  currentAccount = null
}

async function getMsalInstance(): Promise<PublicClientApplication> {
  const clientId = getClientId()
  if (!clientId) throw new Error('Outlook client ID not configured')

  if (!msalInstance) {
    msalInstance = new PublicClientApplication({
      auth: {
        clientId,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    })
    await msalInstance.initialize()

    // Check if we already have an account in cache
    const accounts = msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      currentAccount = accounts[0]
    }
  }
  return msalInstance
}

export async function connectOutlook(): Promise<AccountInfo> {
  const instance = await getMsalInstance()

  let result: AuthenticationResult
  try {
    // Try silent first (if cached)
    const accounts = instance.getAllAccounts()
    if (accounts.length > 0) {
      result = await instance.acquireTokenSilent({
        scopes: SCOPES,
        account: accounts[0],
      })
    } else {
      result = await instance.loginPopup({ scopes: SCOPES })
    }
  } catch {
    // Falls back to popup
    result = await instance.loginPopup({ scopes: SCOPES })
  }

  currentAccount = result.account
  return result.account!
}

export async function disconnectOutlook() {
  if (msalInstance && currentAccount) {
    try {
      await msalInstance.logoutPopup({ account: currentAccount })
    } catch {
      // Swallow — user may have closed popup
    }
  }
  currentAccount = null
}

async function getAccessToken(): Promise<string> {
  const instance = await getMsalInstance()
  if (!currentAccount) throw new Error('Not connected to Outlook')

  const result = await instance.acquireTokenSilent({
    scopes: SCOPES,
    account: currentAccount,
  })
  return result.accessToken
}

interface GraphEvent {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  isAllDay: boolean
  location?: { displayName: string }
  bodyPreview?: string
}

export async function fetchOutlookEvents(
  startDate: Date,
  endDate: Date,
): Promise<CalendarEvent[]> {
  const token = await getAccessToken()
  const startISO = startDate.toISOString()
  const endISO = endDate.toISOString()

  const url = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startISO}&endDateTime=${endISO}&$top=200&$orderby=start/dateTime`

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!resp.ok) {
    throw new Error(`Graph API error: ${resp.status}`)
  }

  const data = await resp.json()
  const events: GraphEvent[] = data.value ?? []

  return events.map((ev) => ({
    id: `outlook-${ev.id}`,
    title: ev.subject || '(No title)',
    start: new Date(ev.start.dateTime + 'Z'),
    end: new Date(ev.end.dateTime + 'Z'),
    allDay: ev.isAllDay,
    source: 'outlook' as const,
    location: ev.location?.displayName || undefined,
    description: ev.bodyPreview || undefined,
  }))
}
