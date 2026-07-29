const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(page, /function buildShareUrl\(\)/, 'page must build a parameterized share URL');
assert.match(page, /new URLSearchParams\(/, 'share URL must use structured query parameters');
assert.match(page, /function applySharedScenario\(\)/, 'page must restore a scenario from the URL');
assert.match(page, /params\.get\('type'\)/, 'shared scenario must restore vehicle type');
assert.match(page, /raw === null/, 'missing shared parameters must preserve the current defaults');
assert.match(page, /const SHARE_PARAM_KEYS =/, 'share URL must use compact parameter keys');
assert.match(page, /type: 't'/, 'vehicle type must use a one-letter key');
assert.match(page, /const SHARE_DEFAULTS =/, 'share URL must omit values that match defaults');
assert.match(page, /SHARE_PARAM_KEYS\[id\].*\?\?.*params\.get\(id\)/, 'compact links must retain compatibility with old long keys');
assert.match(page, /carPrice/, 'shared scenario must include car price');
assert.match(page, /mileage/, 'shared scenario must include annual mileage');
assert.match(page, /id="costInsight"/, 'page needs an insight output region');
assert.match(page, /function getCostInsight\(d, r\)/, 'page must derive one cost insight from the inputs and result');
assert.match(page, /energySensitivity/, 'insight must explain energy-price sensitivity when applicable');

console.log('share link and insights contract passed');
