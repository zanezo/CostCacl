const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const filename of ['event.js', 'stats.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'api', filename), 'utf8');
  assert.match(source, /export default\s*\{\s*async fetch\(request\)/, `${filename} must use the existing Edge fetch interface`);
  assert.doesNotMatch(source, /module\.exports/, `${filename} must not use the Node req/res interface`);
}

const stats = fs.readFileSync(path.join(__dirname, '..', 'api', 'stats.js'), 'utf8');
assert.match(stats, /cost-calc:visits/, 'stats must load the existing visit counter key');
assert.match(stats, /crypto\.subtle\.digest/, 'stats must use an Edge-compatible safe token comparison');

console.log('edge API runtime contract passed');
