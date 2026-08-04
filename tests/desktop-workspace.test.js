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
assert.match(page, /desktop-breakdown/, 'desktop layout should expose a dedicated right-side breakdown column');
assert.match(page, /\.desktop-breakdown\s*\{[^}]*display\s*:\s*grid[^}]*gap\s*:\s*18px/, 'desktop right column should stack detail and taxi cards with consistent spacing');
assert.match(page, /analysis\.append\(hero,\s*chart\)/, 'desktop analysis column should keep the hero and chart together');
assert.match(page, /breakdown\.append\(detail,\s*taxiCard\)/, 'desktop right column should stack detail and taxi cards together');
assert.doesNotMatch(page, /taxiBand\.append\(taxiCard\)/, 'desktop layout should no longer place taxi card in a separate horizontal band');
assert.doesNotMatch(page, /workspace\.append\(parameters,\s*analysis,\s*breakdown,\s*taxiBand\)/, 'desktop workspace should no longer add a fourth taxi band row');
assert.match(page, /workspace\.append\(parameters,\s*analysis,\s*breakdown\)/, 'desktop workspace should end with three aligned columns');

console.log('desktop workspace layout contract passed');
