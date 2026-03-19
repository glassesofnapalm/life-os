import { useRef, useState, useCallback } from 'react';
import { Sun, Moon, Image, Trash2, Upload, CalendarDays, Link2, FileUp, Check, X, Loader2, RefreshCw, Music, Brain } from 'lucide-react';
import { getSpotifyClientId, setSpotifyClientId, isSpotifyConnected, initiateSpotifyAuth, clearSpotifyAuth, getDeployUrl, setDeployUrl, getSpotifyRedirectUri } from '@/lib/spotify';
import { getClaudeApiKey, setClaudeApiKey, clearClaudeApiKey, isClaudeConfigured } from '@/lib/claude';
import { format } from 'date-fns';
import { useStore, useActions, mergeExternalEvents, clearExternalEvents } from '@/stores/store';
import {
  isOutlookConfigured,
  isOutlookConnected,
  setOutlookClientId,
  connectOutlook,
  disconnectOutlook,
  clearOutlookConnection,
  fetchOutlookEvents,
} from '@/lib/outlook';
import {
  parseIcsFile,
  getCachedICloudEvents,
  cacheICloudEvents,
  clearICloudCache,
  getICloudSubscriptionUrl,
  setICloudSubscriptionUrl,
  clearICloudSyncMeta,
} from '@/lib/ical';
import { useICloudSync } from '@/hooks/useICloudSync';
import { addMonths, subMonths } from 'date-fns';

function DeploymentSettings() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const [deployUrl, setDeployUrlLocal] = useState(() => {
    const stored = localStorage.getItem('lifeos_deploy_url');
    return stored && stored !== window.location.origin ? stored : '';
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!deployUrl.trim()) return;
    try {
      const parsed = new URL(deployUrl.trim());
      setDeployUrl(parsed.origin);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // invalid URL — ignore
    }
  }

  function handleClear() {
    localStorage.removeItem('lifeos_deploy_url');
    setDeployUrlLocal('');
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <h2 className="heading-md" style={{ marginBottom: 16 }}>Deployment</h2>

      <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', alignItems: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLocalhost ? 'var(--accent-green)' : 'var(--accent-blue)', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {isLocalhost ? 'Local development' : 'Production'}
          </p>
          <p className="body-xs">{window.location.origin}</p>
        </div>
      </div>

      <p className="body-xs" style={{ marginBottom: 10 }}>
        If you deploy to Vercel, add your production URL here so Spotify OAuth uses the correct redirect URI.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          placeholder="https://my-life-os.vercel.app"
          value={deployUrl}
          onChange={e => setDeployUrlLocal(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={!deployUrl.trim()}>
          {saved ? <><Check size={13} /> Saved</> : 'Save'}
        </button>
        {deployUrl && <button className="btn btn-ghost btn-sm" onClick={handleClear}><X size={13} /></button>}
      </div>

      <p className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
        Active Spotify redirect URI:{' '}
        <code style={{ fontSize: 11, background: 'var(--glass-bg-active)', padding: '1px 5px', borderRadius: 4, color: 'var(--accent-blue)' }}>
          {getSpotifyRedirectUri()}
        </code>
      </p>
    </div>
  );
}

function SpotifySettings() {
  const [clientId, setClientIdLocal] = useState(() => getSpotifyClientId() || '');
  const [connected, setConnected]    = useState(isSpotifyConnected);
  const [saved, setSaved]            = useState(false);

  function handleSave() {
    if (!clientId.trim()) return;
    setSpotifyClientId(clientId.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDisconnect() {
    clearSpotifyAuth();
    setConnected(false);
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Music size={18} style={{ color: '#1DB954' }} />
        <h2 className="heading-md">Spotify</h2>
        {connected && (
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
            <Check size={10} /> Connected
          </span>
        )}
      </div>

      <div style={{ background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14 }}>
        <p className="body-xs" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Setup steps:</p>
        <ol style={{ paddingLeft: 18, margin: 0 }}>
          <li className="body-xs" style={{ marginBottom: 3 }}>
            Go to{' '}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>
              developer.spotify.com/dashboard
            </a>
            {' '}→ Create app
          </li>
          <li className="body-xs" style={{ marginBottom: 3 }}>
            In the app settings, add this as a Redirect URI:
          </li>
        </ol>
        <code style={{ display: 'block', fontSize: 11, background: 'var(--bg-primary)', padding: '5px 8px', borderRadius: 6, marginTop: 4, color: 'var(--accent-blue)', wordBreak: 'break-all' }}>
          {getSpotifyRedirectUri()}
        </code>
        <p className="body-xs" style={{ marginTop: 6, color: 'var(--text-tertiary)' }}>
          {window.location.hostname === 'localhost'
            ? 'Local dev: http://localhost is fine — Spotify explicitly allows it. Set your Vercel URL in Deployment below when you go live.'
            : 'Production: ensure this https:// URI is added in your Spotify app dashboard.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Spotify Client ID"
          value={clientId}
          onChange={e => setClientIdLocal(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={!clientId.trim()}>
          {saved ? <><Check size={13} /> Saved</> : 'Save'}
        </button>
      </div>

      {getSpotifyClientId() && (
        connected ? (
          <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>Disconnect Spotify</button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => initiateSpotifyAuth().catch(() => {})}
            style={{ background: '#1DB954', borderColor: '#1DB954', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Music size={13} /> Connect Spotify
          </button>
        )
      )}
    </div>
  );
}

function ClaudeSettings() {
  const [apiKey, setApiKeyLocal] = useState(() => getClaudeApiKey() || '');
  const [configured, setConfigured] = useState(isClaudeConfigured);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!apiKey.trim()) return;
    setClaudeApiKey(apiKey.trim());
    setConfigured(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    clearClaudeApiKey();
    setApiKeyLocal('');
    setConfigured(false);
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Brain size={18} style={{ color: 'var(--accent-purple)' }} />
        <h2 className="heading-md">Claude AI</h2>
        {configured && (
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
            <Check size={10} /> Configured
          </span>
        )}
      </div>

      <div style={{ background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14 }}>
        <p className="body-xs" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Used for: Meal Planner recipe generation</p>
        <p className="body-xs">
          Get a free API key at{' '}
          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>
            console.anthropic.com
          </a>
          . Your key is stored locally and never sent to any server.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          placeholder="sk-ant-..."
          value={apiKey}
          type="password"
          onChange={e => setApiKeyLocal(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={!apiKey.trim()}>
          {saved ? <><Check size={13} /> Saved</> : 'Save'}
        </button>
        {configured && (
          <button className="btn btn-ghost btn-sm" onClick={handleClear} style={{ color: 'var(--accent-red)' }}>
            <X size={13} />
          </button>
        )}
      </div>
      <p className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
        Once set, go to the Dashboard and add the Meal Planner widget to generate weekly recipes.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const theme = useStore(s => s.theme);
  const bgImage = useStore(s => s.backgroundImage);
  const { toggleTheme, setBackgroundImage } = useActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);

  // Outlook state
  const [outlookClientId, setLocalClientId] = useState(() => localStorage.getItem('outlook_client_id') || '');
  const [outlookConnected, setOutlookConnected] = useState(() => isOutlookConnected());
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [outlookError, setOutlookError] = useState('');
  const [outlookStatus, setOutlookStatus] = useState('');

  // iCloud state
  const [icloudEventCount, setIcloudEventCount] = useState(() => getCachedICloudEvents().length);
  const [icsLoading, setIcsLoading] = useState(false);
  const [icsError, setIcsError] = useState('');
  const [icsStatus, setIcsStatus] = useState('');
  const [subscriptionUrl, setSubscriptionUrlLocal] = useState(() => getICloudSubscriptionUrl() || '');
  const { syncing: icloudLiveSyncing, lastSync: icloudLastSync, error: icloudLiveError, sync: icloudLiveSync } = useICloudSync();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) setBackgroundImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Outlook handlers ─────────────────────────────────

  const handleSaveClientId = useCallback(() => {
    if (!outlookClientId.trim()) return;
    setOutlookClientId(outlookClientId.trim());
    setOutlookError('');
    setOutlookStatus('Client ID saved');
  }, [outlookClientId]);

  const handleConnectOutlook = useCallback(async () => {
    setOutlookLoading(true);
    setOutlookError('');
    setOutlookStatus('');
    try {
      await connectOutlook();
      setOutlookConnected(true);
      setOutlookStatus('Connected! Fetching events...');

      // Fetch events for ±3 months
      const now = new Date();
      const events = await fetchOutlookEvents(subMonths(now, 3), addMonths(now, 3));
      mergeExternalEvents(events, 'outlook');
      setOutlookStatus(`Synced ${events.length} events from Outlook`);
    } catch (err: any) {
      setOutlookError(err.message || 'Failed to connect');
    } finally {
      setOutlookLoading(false);
    }
  }, []);

  const handleDisconnectOutlook = useCallback(() => {
    disconnectOutlook();
    clearExternalEvents('outlook');
    setOutlookConnected(false);
    setOutlookStatus('Disconnected');
  }, []);

  const handleClearOutlook = useCallback(() => {
    clearOutlookConnection();
    clearExternalEvents('outlook');
    setOutlookConnected(false);
    setLocalClientId('');
    setOutlookStatus('');
  }, []);

  // ── iCloud handlers ─────────────────────────────────

  const handleIcsImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIcsLoading(true);
    setIcsError('');
    setIcsStatus('');
    try {
      const events = await parseIcsFile(file, 'icloud');
      cacheICloudEvents(events);
      mergeExternalEvents(events, 'icloud');
      setIcloudEventCount(events.length);
      setIcsStatus(`Imported ${events.length} events from ${file.name}`);
    } catch (err: any) {
      setIcsError(err.message || 'Failed to parse .ics file');
    } finally {
      setIcsLoading(false);
      e.target.value = '';
    }
  }, []);

  const handleLoadCachedICloud = useCallback(() => {
    const events = getCachedICloudEvents();
    if (events.length > 0) {
      mergeExternalEvents(events, 'icloud');
      setIcsStatus(`Loaded ${events.length} cached events`);
    }
  }, []);

  const handleClearICloud = useCallback(() => {
    clearICloudCache();
    clearICloudSyncMeta();
    clearExternalEvents('icloud');
    setIcloudEventCount(0);
    setSubscriptionUrlLocal('');
    setIcsStatus('iCloud events cleared');
  }, []);

  // Load cached iCloud events on first render
  useState(() => {
    const cached = getCachedICloudEvents();
    if (cached.length > 0) {
      mergeExternalEvents(cached, 'icloud');
    }
  });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="heading-xl">Settings</h1>
        <p className="body-sm" style={{ marginTop: 4 }}>Customise your Life OS experience</p>
      </div>

      {/* ── Calendar Connections ── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <CalendarDays size={18} style={{ color: 'var(--accent-blue)' }} />
          <h2 className="heading-md">Calendar Connections</h2>
        </div>

        {/* Outlook */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Outlook / Microsoft 365</span>
            {outlookConnected && (
              <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
                <Check size={10} /> Connected
              </span>
            )}
          </div>
          <p className="body-xs" style={{ marginBottom: 12 }}>
            Requires an Azure AD app registration.{' '}
            <a
              href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}
            >
              Register one here
            </a>
            {' '}with redirect URI: <code style={{ fontSize: 11, background: 'var(--glass-bg-active)', padding: '1px 4px', borderRadius: 4 }}>{window.location.origin}</code>
          </p>

          {/* Client ID input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              placeholder="Azure Application (client) ID"
              value={outlookClientId}
              onChange={e => setLocalClientId(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button className="btn btn-secondary btn-sm" onClick={handleSaveClientId} disabled={!outlookClientId.trim()}>
              Save
            </button>
          </div>

          {/* Connect / Disconnect */}
          {isOutlookConfigured() && (
            <div style={{ display: 'flex', gap: 8 }}>
              {!outlookConnected ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleConnectOutlook}
                  disabled={outlookLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {outlookLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={13} />}
                  {outlookLoading ? 'Connecting...' : 'Connect Outlook'}
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleConnectOutlook}
                    disabled={outlookLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {outlookLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    Refresh Events
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={handleDisconnectOutlook}>Disconnect</button>
                </>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleClearOutlook} style={{ color: 'var(--accent-red)' }}>
                <X size={13} />
              </button>
            </div>
          )}

          {outlookError && <p className="body-xs" style={{ color: 'var(--accent-red)', marginTop: 8 }}>{outlookError}</p>}
          {outlookStatus && !outlookError && <p className="body-xs" style={{ color: 'var(--accent-green)', marginTop: 8 }}>{outlookStatus}</p>}
        </div>

        <div className="divider" style={{ marginBottom: 24 }} />

        {/* iCloud */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>iCloud Calendar</span>
            {(getICloudSubscriptionUrl() || icloudEventCount > 0) && (
              <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
                {icloudLiveSyncing ? (
                  <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Check size={10} />
                )}
                {icloudLiveSyncing ? 'Syncing...' : `${icloudEventCount > 0 ? `${icloudEventCount} events` : 'Live'}`}
              </span>
            )}
          </div>

          {/* Option 1: Live subscription URL */}
          <p className="body-xs" style={{ marginBottom: 8 }}>
            <strong>Live sync:</strong> Paste your iCloud public calendar URL (webcal://...) for automatic updates every 15 min.
            On Mac: Calendar app → right-click calendar → Share Calendar → Public Calendar → copy URL.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              className="input"
              placeholder="webcal://p31-caldav.icloud.com/published/2/..."
              value={subscriptionUrl}
              onChange={e => setSubscriptionUrlLocal(e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (!subscriptionUrl.trim()) return;
                setICloudSubscriptionUrl(subscriptionUrl.trim());
                icloudLiveSync();
              }}
              disabled={!subscriptionUrl.trim() || icloudLiveSyncing}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Link2 size={13} />
              Subscribe
            </button>
          </div>

          {/* Live sync status row */}
          {getICloudSubscriptionUrl() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => icloudLiveSync()}
                disabled={icloudLiveSyncing}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <RefreshCw size={12} style={icloudLiveSyncing ? { animation: 'spin 1s linear infinite' } : undefined} />
                Refresh now
              </button>
              {icloudLastSync && (
                <span className="body-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Last synced {format(icloudLastSync, 'h:mm a')}
                </span>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  clearICloudSyncMeta();
                  clearICloudCache();
                  clearExternalEvents('icloud');
                  setSubscriptionUrlLocal('');
                  setIcloudEventCount(0);
                }}
                style={{ color: 'var(--accent-red)', marginLeft: 'auto' }}
              >
                Disconnect
              </button>
            </div>
          )}

          {/* Option 2: Manual file import */}
          <p className="body-xs" style={{ marginBottom: 8 }}>
            <strong>Or import a file:</strong> Calendar app → File → Export → Export...
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => icsInputRef.current?.click()}
              disabled={icsLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FileUp size={13} />
              {icsLoading ? 'Importing...' : 'Import .ics File'}
            </button>
          </div>
          <input
            ref={icsInputRef}
            type="file"
            accept=".ics,.ical,text/calendar"
            onChange={handleIcsImport}
            style={{ display: 'none' }}
          />

          {(icsError || icloudLiveError) && (
            <p className="body-xs" style={{ color: 'var(--accent-red)', marginTop: 8 }}>
              {icsError || icloudLiveError}
            </p>
          )}
          {icsStatus && !icsError && <p className="body-xs" style={{ color: 'var(--accent-green)', marginTop: 8 }}>{icsStatus}</p>}
        </div>
      </div>

      {/* ── Deployment ── */}
      <DeploymentSettings />

      {/* ── Spotify ── */}
      <SpotifySettings />

      {/* ── Claude AI ── */}
      <ClaudeSettings />

      {/* ── Appearance ── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 className="heading-md" style={{ marginBottom: 20 }}>Appearance</h2>

        {/* Theme */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Theme</p>
            <p className="body-sm" style={{ marginTop: 2 }}>
              {theme === 'dark' ? 'Dark mode — warm charcoal' : 'Light mode — warm cream'}
            </p>
          </div>
          <button
            className="btn btn-secondary btn-md"
            onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {theme === 'dark'
              ? <><Sun size={15} /> Light Mode</>
              : <><Moon size={15} /> Dark Mode</>}
          </button>
        </div>

        <div className="divider" style={{ marginBottom: 24 }} />

        {/* Background image */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Background Image</p>
              <p className="body-sm" style={{ marginTop: 2 }}>
                {bgImage ? 'Custom background active' : 'Using default solid colour'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Upload size={14} /> Upload
              </button>
              {bgImage && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setBackgroundImage(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Trash2 size={14} /> Remove
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {bgImage ? (
            <div style={{ width: '100%', height: 160, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <img src={bgImage} alt="Background preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', height: 100, borderRadius: 'var(--radius-lg)',
                border: '2px dashed var(--glass-border)', background: 'var(--glass-bg)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                color: 'var(--text-tertiary)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <Image size={20} />
              <span className="body-xs">Click to upload an image</span>
            </button>
          )}
        </div>
      </div>

      {/* ── About ── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 className="heading-md" style={{ marginBottom: 12 }}>About</h2>
        <p className="body-sm">Life OS — your personal operating system.</p>
        <p className="body-xs" style={{ marginTop: 8 }}>Built with React, TypeScript, and Vite.</p>
      </div>
    </div>
  );
}
