import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

/** Tiny server-side CORS proxy for iCloud CalDAV/ICS URLs */
function icalProxyPlugin(): Plugin {
  return {
    name: 'ical-proxy',
    configureServer(server) {
      server.middlewares.use('/ical-proxy', async (req: IncomingMessage, res: ServerResponse) => {
        const raw = req.url ?? ''
        const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
        const params = new URLSearchParams(qs)
        const targetUrl = params.get('url')

        if (!targetUrl) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing url param' }))
          return
        }

        // Convert webcal:// → https://
        const fetchUrl = targetUrl.replace(/^webcal:\/\//i, 'https://')

        try {
          const upstream = await fetch(fetchUrl, {
            headers: { 'User-Agent': 'LifeOS/1.0 (CalDAV client)' },
          })
          const text = await upstream.text()
          res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.statusCode = upstream.status
          res.end(text)
        } catch (err: any) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), icalProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
