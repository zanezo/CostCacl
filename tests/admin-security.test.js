const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

async function main() {
  let now = Date.now();
  const store = new Map();
  const expiry = new Map();
  const used = new Set();
  let verification = {success: true, hostname: 'cost.test', action: 'analytics_login'};
  let verificationDown = false;
  let redisDown = false;
  let checks = 0;
  const env = {ANALYTICS_ADMIN_TOKEN: 'admin-password', TURNSTILE_SITE_KEY: 'public-site-key', TURNSTILE_SECRET_KEY: 'private-secret', UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'redis-test'};
  const fetch = async (url, options) => {
    if (url.includes('siteverify')) {
      checks++;
      if (verificationDown) throw new Error('Offline');
      const body = JSON.parse(options.body);
      assert.equal(body.secret, env.TURNSTILE_SECRET_KEY);
      if (used.has(body.response)) return Response.json({success: false});
      used.add(body.response);
      return Response.json(verification);
    }
    if (redisDown) return Response.json({error: 'Offline'});
    const [op, key, value, , seconds] = JSON.parse(options.body);
    if (expiry.has(key) && expiry.get(key) <= now) { store.delete(key); expiry.delete(key); }
    if (op === 'EVAL') {
      const command = JSON.parse(options.body);
      const limitKey = command[3];
      if (expiry.get(limitKey) <= now) { store.delete(limitKey); expiry.delete(limitKey); }
      const count = (store.get(limitKey) || 0) + 1;
      store.set(limitKey, count);
      if (count === 1) expiry.set(limitKey, now + 900000);
      return Response.json({result: [count, Math.ceil((expiry.get(limitKey) - now) / 1000)]});
    }
    if (op === 'SET') { store.set(key, value); expiry.set(key, now + Number(seconds) * 1000); return Response.json({result: 'OK'}); }
    if (op === 'GET') return Response.json({result: store.get(key) || null});
    if (op === 'DEL') { store.delete(key); return Response.json({result: 1}); }
    if (op === 'MGET') return Response.json({result: Array(56).fill(0)});
    throw new Error('Unexpected Redis command ' + op);
  };
  const handler = vm.runInNewContext(fs.readFileSync('api/stats.js', 'utf8').replace('export default', 'globalThis.handler ='), {
    process: {env}, crypto: crypto.webcrypto, TextEncoder, Request, Response, URL, AbortSignal, fetch, console: {error() {}}
  });
  let sequence = 0;
  const req = (method = 'GET', {body, cookie, ip = '198.51.100.1', origin = 'https://cost.test', headers = {}, query = ''} = {}) => handler.fetch(new Request('https://cost.test/api/stats' + query, {
    method, headers: {Origin: origin, 'x-forwarded-for': ip, ...(cookie ? {Cookie: cookie} : {}), ...headers}, ...(body === undefined ? {} : {body: JSON.stringify(body)})
  }));
  const login = options => req('POST', {body: {token: 'challenge-' + ++sequence, password: 'admin-password'}, ...options});
  const cookieOf = result => result.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await req()).status, 401);
  assert.equal((await req('GET', {headers: {Authorization: 'Bearer admin-password'}})).status, 401);
  assert.equal((await req('POST', {origin: 'https://evil.test'})).status, 403);
  assert.equal((await req('PUT')).status, 405);
  assert.equal((await req('POST', {body: {password: 'admin-password'}})).status, 400);
  assert.equal(checks, 0);
  const config = await (await req('GET', {query: '?config=1'})).json();
  assert.deepEqual(config, {siteKey: 'public-site-key'});
  delete env.TURNSTILE_SECRET_KEY;
  assert.equal((await login()).status, 503);
  env.TURNSTILE_SECRET_KEY = 'private-secret';
  verification.hostname = 'evil.test';
  assert.equal((await login()).status, 403);
  verification.hostname = 'cost.test'; verification.action = 'other';
  assert.equal((await login()).status, 403);
  verification.action = 'analytics_login';
  assert.equal((await login({body: {token: 'wrong-password-challenge', password: 'wrong'}})).status, 401);
  assert.equal((await login({body: {token: 'wrong-password-challenge', password: 'admin-password'}})).status, 403, 'challenge must not be reused');
  verificationDown = true;
  assert.equal((await login()).status, 503);
  verificationDown = false;
  const result = await login({ip: '198.51.100.2'});
  assert.equal(result.status, 200);
  assert.match(result.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict; Max-Age=3600/);
  const cookie = cookieOf(result);
  assert.equal((await req('GET', {cookie})).status, 200);
  assert.equal((await req('DELETE', {cookie, origin: 'https://evil.test'})).status, 403);
  assert.equal((await req('GET', {cookie})).status, 200);
  assert.equal((await req('DELETE', {cookie})).status, 200);
  assert.equal((await req('GET', {cookie})).status, 401);
  const old = cookieOf(await login({ip: '198.51.100.2'}));
  env.ANALYTICS_ADMIN_TOKEN = 'rotated';
  assert.equal((await req('GET', {cookie: old})).status, 401);
  env.ANALYTICS_ADMIN_TOKEN = 'admin-password';
  const expiring = cookieOf(await login({ip: '198.51.100.2'}));
  now += 3600001;
  assert.equal((await req('GET', {cookie: expiring})).status, 401);
  const parallel = await Promise.all(Array.from({length: 12}, () => login({ip: '198.51.100.3'})));
  assert.equal(parallel.filter(r => r.status === 200).length, 10);
  const limited = parallel.find(r => r.status === 429);
  assert.equal(limited.headers.get('Retry-After'), '900');
  const checksBefore = checks;
  assert.equal((await login({ip: '198.51.100.3'})).status, 429);
  assert.equal(checks, checksBefore, 'limit checked before expensive verification');
  now += 900001;
  assert.equal((await login({ip: '198.51.100.3'})).status, 200);
  redisDown = true;
  assert.equal((await login({ip: '198.51.100.4'})).status, 503);
  delete env.ANALYTICS_ADMIN_TOKEN;
  assert.equal((await req()).status, 503);
  assert.ok([...store.keys()].every(key => !key.includes('198.51.100')), 'no raw IP in Redis keys');
  console.log('admin security: captcha, bypass, origin, failure handling, atomic throttling, session expiry, rotation and logout passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
