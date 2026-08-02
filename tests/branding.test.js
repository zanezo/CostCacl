const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const renderedPage = page
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

assert.match(renderedPage, /车辆成本计算器/, 'page should use the new calculator name');
assert.doesNotMatch(renderedPage, /私家车成本计算器/, 'page should not retain the previous calculator name');

console.log('branding contract passed');
