const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /function isDesktopWorkspace\(\)/, 'share behavior needs a reusable desktop breakpoint check');
assert.match(page, /if\s*\(\s*isDesktopWorkspace\(\)\s*\)/, 'desktop share must select the clipboard flow');
assert.match(page, /share\.textContent='\\u590d\\u5236\\u7ed3\\u679c';/, 'desktop action needs copy-result wording');

console.log('desktop share behavior contract passed');