import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/* In `npm run dev`, answer /api/contact with the same handler Vercel runs in production (api/contact.js), so the contact
   form sends from localhost too. DISCORD_WEBHOOK_URL comes from .env.local. */
function devApi() {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/contact', async (req, res) => {
        let raw = '';
        for await (const chunk of req) { raw += chunk; }
        let body = {};
        try { body = JSON.parse(raw || '{}'); } catch { /* the handler rejects an empty body */ }
        const reply = {
          status(code) { res.statusCode = code; return reply; },
          setHeader(k, v) { res.setHeader(k, v); return reply; },
          json(data) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return reply; }
        };
        try {
          const { default: handler } = await server.ssrLoadModule('/api/contact.js');
          await handler({ method: req.method, body }, reply);
        } catch (err) {
          server.config.logger.error('[api/contact] ' + err.message);
          reply.status(500).json({ error: 'Server error' });
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DISCORD_');
  if (env.DISCORD_WEBHOOK_URL && !process.env.DISCORD_WEBHOOK_URL) { process.env.DISCORD_WEBHOOK_URL = env.DISCORD_WEBHOOK_URL; }
  return { plugins: [react(), devApi()] };
});
