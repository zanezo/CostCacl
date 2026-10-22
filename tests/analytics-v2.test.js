const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('api/event.js', 'utf8');
assert.ok(source.includes('stats:v2:'), 'new counts must not mix with legacy totals');
assert.ok(source.includes('EVAL'), 'daily dedupe and counters must commit atomically');
const stats = fs.readFileSync('api/stats.js', 'utf8');
assert.ok(stats.includes('daily'), 'dashboard should expose daily trends');
assert.ok(stats.includes('page_view'), 'conversion denominator must use the same daily browser counting');
const page = fs.readFileSync('index.html', 'utf8');
assert.ok(!page.includes('completedKey'), 'old delayed-input completion must be removed');
async function main() {
  let now = Date.parse('2026-10-22T15:59:59Z');
  class Clock extends Date { static now() { return now; } }
  const store = new Map();
  const calls = [];
  let broken = false;
  const mockFetch = async (_, options) => {
    const command = JSON.parse(options.body);
    calls.push(command);
    if (broken) return Response.json({error: 'unavailable'});
    const [op, key] = command;
    if (op === 'INCR') { store.set(key, (store.get(key) || 0) + 1); return Response.json({result: store.get(key)}); }
    if (op === 'EXPIRE') return Response.json({result: 1});
    if (op === 'MGET') return Response.json({result: command.slice(1).map(k => store.get(k) || null)});
    if (op === 'GET') return Response.json({result: store.get(key) || null});
    assert.equal(op, 'EVAL');
    const [lock, total, daily] = command.slice(3);
    if (store.has(lock)) return Response.json({result: 0});
    store.set(total, (store.get(total) || 0) + 1);
    store.set(daily, (store.get(daily) || 0) + 1);
    store.set(lock, 1);
    return Response.json({result: 1});
  };
  const context = {
    Request, Response, TextEncoder, URL, AbortSignal, Date: Clock, crypto: require('node:crypto').webcrypto,
    process: {env: {UPSTASH_REDIS_REST_URL: 'https://redis.test', UPSTASH_REDIS_REST_TOKEN: 'test', ANALYTICS_ADMIN_TOKEN: 'admin'}},
    fetch: mockFetch, console: {error() {}}
  };
  const load = text => vm.runInNewContext(text.replace('export default', 'globalThis.handler ='), {...context}).fetch;
  const event = load(source);
  const dashboard = load(stats);
  const send = (name = 'page_view', extra = {}) => event(new Request('https://test/api/event', {
    method: 'POST', body: JSON.stringify({event: name, visitorId: 'browser-1234567890', version: 2, ...extra})
  }));
  assert.equal((await send()).status, 200);
  assert.equal((await (await send()).json()).duplicate, true);
  assert.equal(store.get('stats:v2:page_view'), 1);
  assert.equal(store.get('stats:v2:daily:2026-10-22:page_view'), 1);
  await send('result_card_generated');
  await send('result_card_generated');
  assert.equal(store.get('stats:v2:result_card_generated'), 1);
  const before = calls.length;
  assert.equal((await send('page_view', {version: 1})).status, 400);
  assert.equal((await send('__proto__')).status, 400);
  assert.equal(calls.length, before, 'invalid events must not touch Redis');
  now += 2000;
  await send();
  await send('calculation_completed');
  assert.equal(store.get('stats:v2:page_view'), 2, 'Beijing midnight starts a new daily count');
  assert.equal(store.get('stats:v2:daily:2026-10-23:page_view'), 1);
  const request = headers => new Request('https://test/api/stats', {headers});
  assert.equal((await dashboard(request({}))).status, 401);
  assert.equal((await dashboard(request({Authorization:'Bearer wrong'}))).status, 401);
  assert.equal((await dashboard(request({Authorization:'Bearer admin'}))).status, 401, 'password cannot bypass captcha');
  const sessionToken = 'a'.repeat(64);
  const hash = value => require('node:crypto').createHash('sha256').update(value).digest('hex');
  store.set('stats:admin:session:' + hash(sessionToken), hash('admin'));
  const headers = {Cookie: '__Secure-costcalc_admin=' + sessionToken};
  const payload = await (await dashboard(request(headers))).json();
  assert.equal(payload.version, 2);
  assert.equal(payload.daily.length, 7);
  assert.equal(payload.daily[6].day, '2026-10-23');
  assert.equal(payload.daily[6].page_view, 1);
  assert.equal(payload.conversion.calculationRate, 0.5);
  broken = true;
  assert.equal((await send()).status, 503, 'Redis errors must never report a counted event');
  assert.equal((await dashboard(request(headers))).status, 503);
  console.log('analytics v2: daily dedupe, midnight, auth, trends, legacy isolation and errors passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
