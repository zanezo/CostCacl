const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /desktop-workspace/, 'desktop layout needs a dedicated three-column workspace');
assert.match(
  page,
  /desktop-toolbar\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)\s+minmax\(360px,460px\)\s+minmax\(0,1fr\)/,
  'desktop vehicle switch must be centered between symmetric grid tracks'
);

console.log('desktop workspace layout contract passed');