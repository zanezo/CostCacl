const EVENT_CONFIG = Object.fromEntries(['page_view', 'calculation_completed', 'result_card_generated', 'result_saved', 'result_shared', 'feedback_clicked', 'return_visit'].map(name => [name, { key: 'stats:v2:' + name, limit: 40, window: 60 }]));
// Same China-calendar-day browser counting for every funnel stage.
const COUNT_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('INCR', KEYS[2])
redis.call('INCR', KEYS[3])
redis.call('SET', KEYS[1], '1', 'EX', 172800)
return 1
`;

function response(payload, status = 200, headers = {}) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  return (
    request.headers.get('cf-connecting-ip') ||
    forwarded.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
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
  const payload = await redisResponse.json();
  if (payload.error) throw new Error('Redis command failed');
  return payload;
}

function safeVisitorId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(value) ? value : null;
}

async function checkThrottle(eventName, request, config) {
  const ip = getClientIp(request).replace(/[^a-zA-Z0-9:._-]/g, '_');
  const key = `stats:throttle:${eventName}:${ip}`;
  const result = await redisCommand(['INCR', key]);
  const count = Number(result.result || 0);
  if (count === 1) await redisCommand(['EXPIRE', key, config.window]);
  return count > config.limit;
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
    const config = Object.hasOwn(EVENT_CONFIG, eventName) ? EVENT_CONFIG[eventName] : null;
    if (!config) return response({ error: 'Unsupported event' }, 400);
    const visitorId = safeVisitorId(body.visitorId);
    if (body.version !== 2 || !visitorId) return response({ error: 'Analytics v2 visitor required' }, 400);

    try {
      if (await checkThrottle(eventName, request, config)) {
        return response({ ok: false, throttled: true, cooldown: config.window }, 429);
      }

      const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
      const result = await redisCommand(['EVAL', COUNT_SCRIPT, 3,
        'stats:v2:dedupe:' + day + ':' + eventName + ':' + visitorId,
        config.key, 'stats:v2:daily:' + day + ':' + eventName]);
      return response({ ok: true, duplicate: Number(result.result) === 0 });
    } catch (error) {
      console.error('Event analytics error:', error);
      return response({ error: 'Analytics unavailable' }, 503);
    }
  }
};
