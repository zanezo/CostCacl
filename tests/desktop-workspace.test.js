const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /desktop-workspace/, 'desktop layout needs a dedicated three-column workspace');
assert.match(page, /desktop-toolbar/, 'desktop layout needs a global toolbar for vehicle mode and actions');
assert.match(page, /mountDesktopWorkspace/, 'desktop layout needs a breakpoint-gated DOM arrangement function');
assert.match(page, /min-width:\s*960px/, 'desktop layout must not affect the mobile presentation');
assert.match(page, /parameters\.innerHTML='<h2 class="desktop-panel-title">&#21442;&#25968;&#37197;&#32622;<\/h2>';/, 'desktop parameter panel title must use encoding-safe text');

console.log('desktop workspace layout contract passed');