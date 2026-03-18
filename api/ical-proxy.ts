import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS from the app's own origin
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url param' })
    return
  }

  // Convert webcal:// → https://
  const fetchUrl = url.replace(/^webcal:\/\//i, 'https://')

  // Basic SSRF guard: only allow https and known calendar domains
  try {
    const parsed = new URL(fetchUrl)
    if (parsed.protocol !== 'https:') {
      res.status(400).json({ error: 'Only https:// URLs are allowed' })
      return
    }
  } catch {
    res.status(400).json({ error: 'Invalid URL' })
    return
  }

  try {
    const upstream = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'LifeOS/1.0 (CalDAV client)',
        Accept: 'text/calendar, */*',
      },
    })

    const text = await upstream.text()
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.status(upstream.status).send(text)
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? 'Upstream fetch failed' })
  }
}
