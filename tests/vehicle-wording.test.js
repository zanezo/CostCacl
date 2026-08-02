const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.doesNotMatch(page, /私家车/, 'page should use the broader vehicle wording everywhere');
assert.match(page, /车辆/, 'page should contain the replacement wording');

console.log('vehicle wording contract passed');
