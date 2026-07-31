const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const api = fs.readFileSync(path.join(__dirname, '..', 'api', 'event.js'), 'utf8');

for (const eventName of [
  'calculation_completed',
  'result_card_generated',
  'result_shared',
  'feedback_clicked',
  'return_visit'
]) {
  assert.match(page, new RegExp(eventName), `page should report ${eventName}`);
  assert.match(api, new RegExp(eventName), `API should whitelist ${eventName}`);
}

assert.match(page, /\/api\/event/, 'page should send events to the event API');
assert.match(page, /localStorage/, 'visitor identity should stay client-side');
assert.match(api, /req\.method\s*!==\s*['"]POST['"]/, 'event API should only accept POST');
assert.match(api, /INCR/, 'event API should increment counters');
assert.match(api, /SET/, 'event API should support deduplication locks');

console.log('event analytics contract passed');
