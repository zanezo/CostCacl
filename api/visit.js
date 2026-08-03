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
  return redisResponse.json();
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }

    try {
      const ip = getClientIp(request).replace(/[^a-zA-Z0-9:._-]/g, '_');
      const visitKey = 'cost-calc:visits';
      const dedupeKey = `cost-calc:visit:dedupe:${ip}`;
      const lock = await redisCommand(['SET', dedupeKey, '1', 'EX', 1800, 'NX']);

      let countResult;
      if (lock.result !== null) {
        countResult = await redisCommand(['INCR', visitKey]);
      } else {
        countResult = await redisCommand(['GET', visitKey]);
      }

      return response({ count: Number(countResult.result || 0) });
    } catch (error) {
      return response({ error: 'Visit counter is unavailable' }, 502);
    }
  },
};
