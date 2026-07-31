const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /<footer class="site-footer"/, 'site footer should exist');
assert.match(page, /class="footer-identity"/, 'footer should identify the calculator');
assert.match(page, /class="footer-contact"/, 'footer should provide a feedback area');
assert.match(page, /https:\/\/github\.com\/zanezo\/CostCacl\/issues/, 'feedback should lead to the project issue tracker');
assert.match(page, /\.site-footer\s*\{/, 'footer needs dedicated styling');
assert.match(page, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.site-footer/, 'footer should adapt to phones');

console.log('footer contract passed');
