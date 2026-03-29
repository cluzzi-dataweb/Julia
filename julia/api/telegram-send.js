export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      res.status(400).json({ ok: false, error: 'Invalid JSON body' });
      return;
    }
  }

  const chatId = body && body.chatId ? String(body.chatId).trim() : '';
  const message = body && body.message ? String(body.message).trim() : '';

  if (!chatId || !message) {
    res.status(400).json({ ok: false, error: 'chatId and message are required' });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      const errorMessage = data && data.description ? data.description : 'Telegram send failed';
      res.status(400).json({ ok: false, error: errorMessage });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Server error sending message' });
  }
}
