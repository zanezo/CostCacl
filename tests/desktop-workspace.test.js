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
assert.match(page, /desktop-taxi-band/, 'desktop layout should expose a dedicated shared taxi area');
assert.match(page, /\.desktop-taxi-band\s*\{[^}]*grid-column\s*:\s*2\s*\/\s*4/, 'shared taxi area should sit beneath the center and right columns');
assert.match(page, /groups\.length!==3/, 'desktop layout should only depend on the first three parameter groups');
assert.match(page, /parameters\.append\(\.\.\.groups\)/, 'desktop parameters column should keep all remaining visible groups together');
assert.match(page, /analysis\.append\(hero,\s*chart\)/, 'desktop analysis column should keep the hero and chart together');
assert.match(page, /taxiBand\.append\(taxiCard\)/, 'desktop taxi area should keep only the lightweight taxi reference card');
assert.doesNotMatch(page, /taxiBand\.append\(taxiCard,\s*groups\[3\]\)/, 'desktop taxi area should not reattach the removed taxi parameter group');
assert.match(page, /workspace\.append\(parameters,\s*analysis,\s*breakdown,\s*taxiBand\)/, 'desktop workspace should place the shared taxi area after the main columns');

console.log('desktop workspace layout contract passed');
