import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeSpotifyCode } from '@/lib/spotify'

export default function SpotifyCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err  = params.get('error')

    if (err || !code) {
      setError(err ?? 'No authorization code received')
      return
    }

    exchangeSpotifyCode(code)
      .then(() => navigate('/', { replace: true }))
      .catch(e => setError(e.message ?? 'Authorization failed'))
  }, [navigate])

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      {error ? (
        <>
          <p style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Spotify connection failed</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Go back</button>
        </>
      ) : (
        <>
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Connecting to Spotify…</p>
        </>
      )}
    </div>
  )
}
