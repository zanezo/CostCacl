const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const renderedPage = page
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

assert.doesNotMatch(page, /私家车|\\u79c1\\u5bb6\\u8f66|&#31169;&#23478;&#36710;/, 'source should not retain any private-car wording form');
assert.doesNotMatch(renderedPage, /私家车/, 'rendered wording should avoid private-car phrasing');
assert.match(renderedPage, /车辆成本计算器/, 'rendered wording should use the broader vehicle calculator name');

console.log('vehicle wording contract passed');
