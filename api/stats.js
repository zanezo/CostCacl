const METRICS = [
  ['visit', 'cost-calc:visits'],
  ['calculation_completed', 'stats:calculation_completed'],
  ['result_card_generated', 'stats:result_card_generated'],
  ['result_shared', 'stats:result_shared'],
  ['feedback_clicked', 'stats:feedback_clicked'],
  ['return_visit', 'stats:return_visit']
];

function response(payload, status = 200, headers = {}) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow', ...headers }
  });
}

async function timingSafeEqual(actual, expected) {
  if (!actual || !expected) return false;
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const actualBytes = new Uint8Array(actualHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = actualBytes.length ^ expectedBytes.length;
  for (let index = 0; index < actualBytes.length; index += 1) difference |= actualBytes[index] ^ expectedBytes[index];
  return difference === 0;
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

async function loadMetrics() {
  const payload = await redisCommand(['MGET', ...METRICS.map(([, key]) => key)]);
  return Object.fromEntries(METRICS.map(([name], index) => [name, Number(payload.result?.[index] || 0)]));
}

export default {
  async fetch(request) {
    const req = request;
    if (req.method !== 'GET') return response({ error: 'Method not allowed' }, 405, { Allow: 'GET' });

    if (!process.env.ANALYTICS_GATE_TOKEN || !process.env.ANALYTICS_ADMIN_TOKEN) {
      return response({ error: 'Analytics protection is not configured' }, 503);
    }

    const gateToken = request.headers.get('X-Analytics-Gate') || '';
    if (!(await timingSafeEqual(gateToken, process.env.ANALYTICS_GATE_TOKEN))) {
      return response({ error: 'Forbidden' }, 403);
    }

    const authorization = request.headers.get('Authorization') || '';
    const requestToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!(await timingSafeEqual(requestToken, process.env.ANALYTICS_ADMIN_TOKEN))) {
      return response({ error: 'Unauthorized' }, 401);
    }

    try {
      const metrics = await loadMetrics();
      const conversion = {
        calculationRate: metrics.visit ? metrics.calculation_completed / metrics.visit : 0,
        cardRate: metrics.calculation_completed ? metrics.result_card_generated / metrics.calculation_completed : 0,
        shareRate: metrics.calculation_completed ? metrics.result_shared / metrics.calculation_completed : 0
      };
      return response({ metrics, conversion, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Stats dashboard error:', error);
      return response({ error: 'Stats unavailable' }, 503);
    }
  }
};
