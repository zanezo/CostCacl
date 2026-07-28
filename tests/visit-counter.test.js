const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const apiPath = path.join(root, 'api', 'visit.js');

assert.match(page, /id="visitCount"/, 'page needs a compact visit counter target');
assert.match(page, /fetch\('\/api\/visit'/, 'page must request the server-side visit endpoint');
assert.doesNotMatch(page, /UPSTASH_REDIS_REST_TOKEN/, 'Redis credentials must not be exposed in the browser');
assert.ok(fs.existsSync(apiPath), 'Vercel visit endpoint must exist');

const api = fs.readFileSync(apiPath, 'utf8');
assert.match(api, /process\.env\.UPSTASH_REDIS_REST_URL/, 'endpoint must read the Redis URL from environment variables');
assert.match(api, /process\.env\.UPSTASH_REDIS_REST_TOKEN/, 'endpoint must read the Redis token from environment variables');
assert.match(api, /incr\/cost-calc:visits/, 'endpoint must atomically increment the visit count');

console.log('visit counter contract passed');
