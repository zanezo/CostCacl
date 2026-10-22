const METRICS = ['page_view', 'calculation_completed', 'result_card_generated', 'result_saved', 'result_shared', 'feedback_clicked', 'return_visit'];
// Legacy counters (cost-calc:visits, stats:calculation_completed) remain untouched.
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
  const payload = await redisResponse.json();
  if (payload.error) throw new Error('Redis command failed');
  return payload;
}

async function loadMetrics() {
  const now = Date.now();
  const days = Array.from({length: 7}, (_, i) => new Date(now + 8 * 3600000 - (6 - i) * 86400000).toISOString().slice(0,10));
  const keys = [...METRICS.map(name => 'stats:v2:' + name), ...days.flatMap(day => METRICS.map(name => 'stats:v2:daily:' + day + ':' + name))];
  const payload = await redisCommand(['MGET', ...keys]);
  const values = payload.result || [];
  const metrics = Object.fromEntries(METRICS.map((name, i) => [name, Number(values[i] || 0)]));
  const daily = days.map((day, d) => ({day, ...Object.fromEntries(METRICS.map((name, i) => [name, Number(values[METRICS.length * (d + 1) + i] || 0)]))}));
  return {metrics, daily};
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
      const {metrics, daily} = await loadMetrics();
      const conversion = {
        calculationRate: metrics.page_view ? metrics.calculation_completed / metrics.page_view : 0,
        cardRate: metrics.calculation_completed ? metrics.result_card_generated / metrics.calculation_completed : 0,
        shareRate: metrics.calculation_completed ? metrics.result_shared / metrics.calculation_completed : 0
      };
      return response({ version: 2, timezone: 'Asia/Shanghai', metrics, daily, conversion, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Stats dashboard error:', error);
      return response({ error: 'Stats unavailable' }, 503);
    }
  }
};
