const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /车辆成本计算器/, 'page should use the new calculator name');
assert.doesNotMatch(page, /私家车成本计算器/, 'page should not retain the previous calculator name');

console.log('branding contract passed');
