const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /property="og:title"/, 'page should expose og:title');
assert.match(page, /property="og:description"/, 'page should expose og:description');
assert.match(page, /property="og:image"/, 'page should expose og:image');
assert.match(page, /name="twitter:card"/, 'page should expose twitter:card');
assert.match(page, /rel="canonical"/, 'page should expose a canonical URL');
assert.match(page, /social-preview\.svg/, 'page should point at the social preview image');

console.log('share preview meta contract passed');
