const METRICS = ['page_view', 'calculation_completed', 'result_card_generated', 'result_saved', 'result_shared', 'feedback_clicked', 'return_visit'];
const COOKIE_NAME = '__Secure-costcalc_admin';
const SESSION_SECONDS = 3600;
const LOGIN_WINDOW = 900;
const LOGIN_LIMIT = 10;
const ATTEMPT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], 900) end
return {count, redis.call('TTL', KEYS[1])}
`;
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

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

function cookie(value, seconds = SESSION_SECONDS) {
  return `${COOKIE_NAME}=${value}; Path=/api/stats; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;
}

async function sessionKey(request) {
  const value = (request.headers.get('Cookie') || '').split(';').map(item => item.trim()).find(item => item.startsWith(COOKIE_NAME + '='))?.slice(COOKIE_NAME.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? 'stats:admin:session:' + await digest(value) : null;
}

async function login(request) {
  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) {
    return response({error: 'Verification is not configured', code: 'verification_unconfigured'}, 503);
  }
  const raw = await request.text();
  if (raw.length > 4096) return response({error: 'Request too large'}, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return response({error: 'Invalid request'}, 400); }
  const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
  const attempt = await redisCommand(['EVAL', ATTEMPT_SCRIPT, 1, 'stats:admin:attempt:' + await digest(ip)]);
  const [count, ttl] = attempt.result;
  if (Number(count) > LOGIN_LIMIT) {
    const retryAfter = Math.max(1, Number(ttl) || LOGIN_WINDOW);
    return response({error: 'Too many attempts', code: 'rate_limited', retryAfter}, 429, {'Retry-After': String(retryAfter)});
  }
  if (!body || typeof body.token !== 'string' || !body.token || body.token.length > 2048 || typeof body.password !== 'string' || !body.password || body.password.length > 1024) {
    return response({error: 'Verification and password required', code: 'verification_required'}, 400);
  }
  const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({secret: process.env.TURNSTILE_SECRET_KEY, response: body.token}),
    signal: AbortSignal.timeout(8000)
  });
  if (!verificationResponse.ok) throw new Error('Verification unavailable');
  const verification = await verificationResponse.json();
  if (!verification.success || verification.hostname !== new URL(request.url).hostname || verification.action !== 'analytics_login') {
    return response({error: 'Verification failed', code: 'verification_failed'}, 403);
  }
  if (!(await timingSafeEqual(body.password, process.env.ANALYTICS_ADMIN_TOKEN))) return response({error: 'Unauthorized'}, 401);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  await redisCommand(['SET', 'stats:admin:session:' + await digest(token), await digest(process.env.ANALYTICS_ADMIN_TOKEN), 'EX', SESSION_SECONDS]);
  return response({ok: true}, 200, {'Set-Cookie': cookie(token)});
}

async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis environment variables are missing.');

  const redisResponse = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8000)
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
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) return response({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, DELETE' });

    if (!process.env.ANALYTICS_ADMIN_TOKEN) {
      return response({ error: 'Analytics protection is not configured' }, 503);
    }

    try {
      if (req.method !== 'GET' && request.headers.get('Origin') !== new URL(request.url).origin) return response({error: 'Invalid origin'}, 403);
      if (req.method === 'POST') return await login(request);
      if (req.method === 'GET' && new URL(request.url).searchParams.get('config') === '1') {
        if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) return response({error: 'Verification is not configured', code: 'verification_unconfigured'}, 503);
        return response({siteKey: process.env.TURNSTILE_SITE_KEY});
      }
      const key = await sessionKey(request);
      if (req.method === 'DELETE') {
        if (key) await redisCommand(['DEL', key]);
        return response({ok: true}, 200, {'Set-Cookie': cookie('', 0)});
      }
      const session = key ? await redisCommand(['GET', key]) : null;
      if (!session?.result || !(await timingSafeEqual(session.result, await digest(process.env.ANALYTICS_ADMIN_TOKEN)))) {
        return response({error: 'Unauthorized'}, 401, {'Set-Cookie': cookie('', 0)});
      }
      const {metrics, daily} = await loadMetrics();
      const recent = await redisCommand(['ZREVRANGE', 'stats:v2:profiles', 0, 49]);
      const ids = Array.isArray(recent.result) ? recent.result.filter(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(id)) : [];
      const profiles = ids.length ? await redisCommand(['MGET', ...ids.map(id => 'stats:v2:profile:' + id)]) : {result: []};
      const visitors = (profiles.result || []).flatMap(raw => { try { const p = JSON.parse(raw); return p && p.id && p.nickname ? [p] : []; } catch { return []; } });
      const conversion = {
        calculationRate: metrics.page_view ? metrics.calculation_completed / metrics.page_view : 0,
        cardRate: metrics.calculation_completed ? metrics.result_card_generated / metrics.calculation_completed : 0,
        shareRate: metrics.calculation_completed ? metrics.result_shared / metrics.calculation_completed : 0
      };
      return response({ version: 2, timezone: 'Asia/Shanghai', metrics, daily, visitors, conversion, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Stats dashboard request failed');
      return response({ error: 'Stats unavailable' }, 503);
    }
  }
};
