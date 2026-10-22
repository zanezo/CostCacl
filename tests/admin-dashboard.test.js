const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dashboard = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'stats.js'), 'utf8');

assert.match(dashboard, /<meta name="robots" content="noindex, nofollow">/, 'dashboard must not be indexed');
assert.match(dashboard, /type="password"/, 'dashboard should request a password');
assert.doesNotMatch(dashboard, /accessGate|X-Analytics-Gate/, 'dashboard should only request the admin password');
assert.match(dashboard, /\/api\/stats/, 'dashboard should request the protected stats API');
assert.doesNotMatch(dashboard, /localStorage|sessionStorage/, 'dashboard must not persist the admin token');

assert.match(api, /siteverify/, 'login must verify the challenge server-side');
assert.match(api, /HttpOnly; Secure; SameSite=Strict/, 'sessions must use protected cookies');
assert.doesNotMatch(api, /headers.get\('Authorization'\)/, 'bearer password must not bypass the challenge');
assert.match(api, /ANALYTICS_ADMIN_TOKEN/, 'stats API must require a server-side admin token');
assert.doesNotMatch(api, /ANALYTICS_GATE_TOKEN/, 'stats API should not depend on a second secret');
assert.match(api, /timingSafeEqual/, 'stats API should compare tokens safely');
assert.match(api, /Cache-Control/, 'stats responses must not be cached');
assert.match(api, /stats:calculation_completed/, 'stats API should load analytics counters');
assert.match(api, /conversion/, 'stats API should calculate conversion metrics');

console.log('admin dashboard contract passed');
