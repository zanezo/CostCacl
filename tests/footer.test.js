const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const footerLinkBlock = page.match(/\.footer-link\s*\{[^}]*\}/)?.[0] || '';

assert.ok(page.includes('<footer class="site-footer"'), 'site footer should exist');
assert.ok(page.includes('class="footer-end"'), 'footer should expose an end-of-page cue');
assert.ok(page.includes('&#26412;&#39029;&#20869;&#23481;&#21040;&#36825;&#37324;&#32467;&#26463;'), 'footer should explicitly say the page ends here');
assert.ok(page.includes('&#22914;&#38656;&#32487;&#32493;&#23545;&#27604;&#65292;&#21487;&#22238;&#21040;&#19978;&#26041;&#35843;&#25972;&#21442;&#25968;&#12290;'), 'footer should point users back upward instead of acting like a feature card');
assert.ok(page.includes('https://github.com/zanezo/CostCacl'), 'footer should still link to the repository');
assert.ok(page.includes('https://github.com/zanezo/CostCacl/issues'), 'footer should still link to feedback');
assert.ok(page.includes('width: min(calc(100% - 48px), 1480px);'), 'desktop footer should still align with the main workspace width');
assert.ok(page.includes('background: transparent;'), 'footer should drop the white card background');
assert.ok(footerLinkBlock.length > 0, 'footer link styles should exist');
assert.ok(!/background\s*:/.test(footerLinkBlock), 'footer links should no longer look like pill buttons');
assert.ok(/@media\s*\(max-width:\s*680px\)[\s\S]*?\.site-footer/.test(page), 'footer should still adapt to phones');

console.log('footer contract passed');
