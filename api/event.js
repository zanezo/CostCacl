const EVENT_CONFIG = {
  calculation_completed: { key: 'stats:calculation_completed', once: true },
  result_card_generated: { key: 'stats:result_card_generated', once: false },
  result_shared: { key: 'stats:result_shared', once: false },
  feedback_clicked: { key: 'stats:feedback_clicked', once: true },
  return_visit: { key: 'stats:return_visit', once: true }
};

function response(payload, status = 200, headers = {}) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis environment variables are missing.');

  const redisResponse = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!redisResponse.ok) throw new Error(`Redis request failed: ${redisResponse.status}`);
  return redisResponse.json();
}

function safeVisitorId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(value) ? value : null;
}

export default {
  async fetch(request) {
    const req = request;
    if (req.method !== 'POST') {
      return response({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
    }

    let body;
    try { body = await request.json(); } catch { body = null; }
    const eventName = body && body.event;
    const config = EVENT_CONFIG[eventName];
    if (!config) return response({ error: 'Unsupported event' }, 400);

    try {
      const visitorId = safeVisitorId(body.visitorId);
      if (config.once && visitorId) {
        const lockKey = `stats:dedupe:${eventName}:${visitorId}`;
        const lock = await redisCommand(['SET', lockKey, '1', 'EX', 86400, 'NX']);
        if (lock.result === null) return response({ ok: true, duplicate: true });
      }

      const result = await redisCommand(['INCR', config.key]);
      return response({ ok: true, count: Number(result.result || 0) });
    } catch (error) {
      console.error('Event analytics error:', error);
      return response({ error: 'Analytics unavailable' }, 503);
    }
  }
};