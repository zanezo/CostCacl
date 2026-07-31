const EVENT_CONFIG = {
  calculation_completed: { key: 'stats:calculation_completed', once: true },
  result_card_generated: { key: 'stats:result_card_generated', once: false },
  result_shared: { key: 'stats:result_shared', once: false },
  feedback_clicked: { key: 'stats:feedback_clicked', once: true },
  return_visit: { key: 'stats:return_visit', once: true }
};

function redisConfig() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_TOKEN
  };
}

async function redisCommand(command) {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error('Redis environment variables are missing.');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error(`Redis request failed: ${response.status}`);
  return response.json();
}

function safeVisitorId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(value) ? value : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const eventName = body && body.event;
  const config = EVENT_CONFIG[eventName];
  if (!config) return res.status(400).json({ error: 'Unsupported event' });

  const visitorId = safeVisitorId(body.visitorId);
  try {
    if (config.once && visitorId) {
      const lockKey = `stats:dedupe:${eventName}:${visitorId}`;
      const lock = await redisCommand(['SET', lockKey, '1', 'EX', 86400, 'NX']);
      if (lock.result === null) return res.status(200).json({ ok: true, duplicate: true });
    }

    const result = await redisCommand(['INCR', config.key]);
    return res.status(200).json({ ok: true, count: result.result });
  } catch (error) {
    console.error('Event analytics error:', error);
    return res.status(503).json({ error: 'Analytics unavailable' });
  }
};
