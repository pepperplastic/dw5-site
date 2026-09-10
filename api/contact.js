// POST /api/contact — sends the dw5.llc contact form via Postmark.
// Env vars (Vercel → Settings → Environment Variables):
//   POSTMARK_TOKEN   server token (the Snappy Gold one works — a server token covers all streams)
//   CONTACT_FROM     a sender verified in Postmark, e.g. hello@snappy.gold
//   CONTACT_TO       comma-separated recipients — hello@dw5.llc,davidisaacweiss@yahoo.com
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { name = '', email = '', message = '', company = '' } = req.body || {};
  if (company) return res.status(200).json({ ok: true });                      // honeypot: pretend success
  const clean = (s, n) => String(s).replace(/[\r\n]+/g, ' ').trim().slice(0, n);
  const n = clean(name, 120), e = clean(email, 200), m = String(message).trim().slice(0, 5000);
  if (!n || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || !m) return res.status(400).json({ error: 'Need a name, a real email, and a message' });
  const token = process.env.POSTMARK_TOKEN, from = process.env.CONTACT_FROM, to = process.env.CONTACT_TO;
  if (!token || !from || !to) return res.status(500).json({ error: 'Contact form is not configured' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const text = `From: ${n} <${e}>\nIP: ${ip}\n\n${m}`;
  const r = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Postmark-Server-Token': token },
    body: JSON.stringify({ From: `DW5 site <${from}>`, To: to, ReplyTo: `${n} <${e}>`,
      Subject: `dw5.llc: ${n}`, TextBody: text, MessageStream: 'outbound', Tag: 'dw5-contact' }),
  });
  if (!r.ok) { const t = await r.text(); return res.status(502).json({ error: 'Mail service rejected the message', detail: t.slice(0, 200) }); }
  return res.status(200).json({ ok: true });
};
