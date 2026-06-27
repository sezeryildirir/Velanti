export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      category = '', model = '', payment = '', budget = '',
      credit = '', trade = '', name = '', email = '', phone = ''
    } = body;

    if (!name || !email || !phone) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.LEAD_TO_EMAIL;
    if (!apiKey || !to) {
      return res.status(500).json({ ok: false, error: 'Server not configured' });
    }

    const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const row = (label, value) => value
      ? `<tr><td style="padding:6px 16px 6px 0;color:#8A8270;font-family:Arial,sans-serif;font-size:13px">${label}</td><td style="padding:6px 0;color:#15110D;font-family:Arial,sans-serif;font-size:14px"><strong>${esc(value)}</strong></td></tr>`
      : '';

    const html = `
      <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif">
        <h2 style="color:#15110D;border-bottom:2px solid #C2A24C;padding-bottom:8px">New VELANTI lead</h2>
        <table style="border-collapse:collapse;width:100%">
          ${row('Looking for', category)}
          ${row('Specific model', model)}
          ${row('Payment', payment)}
          ${row('Budget', budget)}
          ${row('Credit range', credit)}
          ${row('Trade-in', trade)}
          ${row('Name', name)}
          ${row('Email', email)}
          ${row('Phone', phone)}
        </table>
        <p style="color:#8A8270;font-size:12px;margin-top:20px">Sent from velantimotors.com</p>
      </div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'VELANTI Leads <leads@velantimotors.com>',
        to: [to],
        reply_to: email,
        subject: `New lead — ${name}${category ? ' · ' + category : ''}`,
        html
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ ok: false, error: 'Email failed', detail });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Unexpected error' });
  }
}
