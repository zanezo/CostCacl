const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const files = ['index.html', 'admin.html', 'install.html'];
const expectedLinks = [
  '<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png">',
  '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">',
  '<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">'
];

for (const file of files) {
  const page = fs.readFileSync(path.join(root, file), 'utf8');
  for (const link of expectedLinks) {
    assert.ok(page.includes(link), file + ' should include ' + link);
  }
  const pos16 = page.indexOf(expectedLinks[0]);
  const pos32 = page.indexOf(expectedLinks[1]);
  const posSvg = page.indexOf(expectedLinks[2]);
  assert.ok(pos16 < pos32 && pos32 < posSvg, file + ' should declare PNG favicons before SVG');
}

const indexPage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(!indexPage.includes('rel="manifest" href="./manifest.json"'), 'index should remove the missing manifest reference');
assert.ok(!indexPage.includes('rel="apple-touch-icon" href="./apple-touch-icon.png"'), 'index should remove the outdated apple touch icon reference');
assert.ok(!indexPage.includes('sizes="192x192" href="./icon-192.png"'), 'index should remove the incorrect 192 icon reference');
assert.ok(!indexPage.includes('sizes="512x512" href="./icon-512.png"'), 'index should remove the incorrect 512 icon reference');

for (const asset of ['favicon.svg', 'favicon-16.png', 'favicon-32.png', 'icon-64.png', 'icon-1024.png']) {
  assert.ok(fs.existsSync(path.join(root, 'icons', asset)), 'icons/' + asset + ' should exist');
}

console.log('favicon head contract passed');
