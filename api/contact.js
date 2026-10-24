/* Vercel serverless function: receives the contact form and forwards it to a Discord channel.
   The webhook URL lives in the DISCORD_WEBHOOK_URL environment variable (Vercel project settings, or .env.local
   with `vercel dev`), so it never ships in the browser bundle. */

const clip = (s, n) => String(s || '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) { return res.status(500).json({ error: 'Not configured' }); }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const name = clip(body.name, 100);
  const email = clip(body.email, 200);
  const message = clip(body.message, 1500);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const r = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      embeds: [{
        title: 'New portfolio message',
        color: 0x2b45ff,
        fields: [
          { name: 'Name', value: name },
          { name: 'Email', value: email },
          { name: 'Message', value: message }
        ],
        timestamp: new Date().toISOString()
      }]
    })
  });

  if (!r.ok) { return res.status(502).json({ error: 'Delivery failed' }); }
  return res.status(200).json({ ok: true });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
