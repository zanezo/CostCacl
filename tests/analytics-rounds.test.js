const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
async function main() {
  const token = 'a'.repeat(64), hash = value => crypto.createHash('sha256').update(value).digest('hex');
  const store = new Map([['stats:admin:session:' + hash(token), hash('admin')], ['stats:v2:page_view', 9]]);
  const calls = [];
  const fetch = async (_, options) => {
    const c = JSON.parse(options.body); calls.push(c);
    const [op,key] = c;
    if (op === 'GET') return Response.json({result:store.get(key) || null});
    if (op === 'MGET') return Response.json({result:c.slice(1).map(k => store.get(k) || null)});
    if (op === 'ZREVRANGE') return Response.json({result:[]});
    if (op === 'EVAL') {
      const expected = c[5], next = c[6], catalog = c[7];
      if ((store.get('stats:round:active') || 'legacy') !== expected) return Response.json({result:0});
      store.set('stats:round:active',next); store.set('stats:round:catalog',catalog);
      return Response.json({result:1});
    }
    throw new Error(op);
  };
  const handler = vm.runInNewContext(fs.readFileSync('api/stats.js','utf8').replace('export default','globalThis.handler ='), {
    Request,Response,URL,TextEncoder,AbortSignal,crypto:crypto.webcrypto,fetch,
    process:{env:{ANALYTICS_ADMIN_TOKEN:'admin',UPSTASH_REDIS_REST_URL:'https://redis.test',UPSTASH_REDIS_REST_TOKEN:'test'}},console
  });
  const request = (method='GET',body,query='',auth=true) => handler.fetch(new Request('https://test/api/stats'+query, {
    method,headers:{Origin:'https://test',...(auth?{Cookie:'__Secure-costcalc_admin='+token}:{})},...(body?{body:JSON.stringify(body)}:{})
  }));
  const old = await (await request()).json();
  assert.equal(old.activeId,'legacy'); assert.equal(old.metrics.page_view,9);
  assert.equal((await request('PATCH',{name:'内测',expectedActive:'legacy'},'',false)).status,401);
  const start = await request('PATCH',{name:'内测第一轮',expectedActive:'legacy'});
  assert.equal(start.status,200);
  const id = (await start.json()).round.id;
  const fresh = await (await request()).json();
  assert.equal(fresh.activeId,id); assert.equal(fresh.metrics.page_view,0);
  assert.ok(fresh.rounds[0].endedAt);
  store.set('stats:round:'+id+':page_view',3);
  assert.equal((await (await request()).json()).metrics.page_view,3);
  assert.equal((await (await request('GET',undefined,'?round=legacy')).json()).metrics.page_view,9);
  assert.equal((await request('PATCH',{name:'重复点击',expectedActive:'legacy'})).status,409);
  assert.equal((await request('PATCH',{name:'',expectedActive:id})).status,400);
  assert.equal((await request('GET',undefined,'?round=missing')).status,404);
  assert.ok(fs.readFileSync('api/event.js','utf8').includes("string.gsub(KEYS[i], '^stats:v2:', prefix)"), 'round must scope dedupe and profiles, not only totals');
  assert.equal(store.get('stats:v2:page_view'),9);
  console.log('analytics rounds: archive preservation, zero start, scoped reads, auth and conflict protection passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
