const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /打车费用对比|打车对比/, 'page should expose a taxi comparison section');
assert.match(page, /id="taxiStartFare"/, 'taxi comparison should let users edit the starting fare');
assert.match(page, /id="taxiStartKm"/, 'taxi comparison should let users edit the included kilometers');
assert.match(page, /id="taxiPerKm"/, 'taxi comparison should let users edit the per-kilometer price');
assert.match(page, /id="taxiTripKm"/, 'taxi comparison should let users edit the assumed trip distance');
assert.match(page, /id="taxiComparisonCard"/, 'page should show a lightweight taxi comparison conclusion card');
assert.match(page, /id="taxiComparisonCard"[\s\S]*?<h3>(?:\u6253\u8f66\u53c2\u8003|\u6253\u8f66\u8d39\u7528\u5bf9\u6bd4|&#25171;&#36710;&#21442;&#32771;|&#25171;&#36710;&#36153;&#29992;&#23545;&#27604;)<\/h3>/, 'taxi comparison card title should render as readable Chinese text');
assert.match(page, /class="taxi-hero-chip"|\.taxi-hero-chip\s*\{/, 'taxi comparison card should expose a lightweight status chip');
assert.match(page, /function getTaxiComparison\(d, r\)/, 'page should calculate a taxi comparison summary');
assert.match(page, /taxiComparison|打车对比/, 'share text should mention taxi comparison');

console.log('taxi comparison contract passed');
