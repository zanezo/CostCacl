const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.doesNotMatch(page, /id="taxiStartFare"/, 'page should remove the editable taxi starting fare control');
assert.doesNotMatch(page, /id="taxiStartKm"/, 'page should remove the editable taxi included-kilometers control');
assert.doesNotMatch(page, /id="taxiPerKm"/, 'page should remove the editable taxi per-kilometer price control');
assert.doesNotMatch(page, /id="taxiTripKm"/, 'page should remove the editable taxi trip-distance control');
assert.match(page, /id="taxiComparisonCard"/, 'page should keep one lightweight taxi comparison conclusion card');
assert.match(page, /id="taxiComparisonCard"[\s\S]*?<h3>(?:\u6253\u8f66\u53c2\u8003|\u6253\u8f66\u8d39\u7528\u5bf9\u6bd4|&#25171;&#36710;&#21442;&#32771;|&#25171;&#36710;&#36153;&#29992;&#23545;&#27604;)<\/h3>/, 'taxi comparison card title should render as readable Chinese text');
assert.match(page, /function getTaxiComparison\(d, r\)/, 'page should calculate a taxi comparison summary');
assert.match(page, /amount\.textContent = '¥' \+ fmt\(taxi\.taxiYear\)/, 'taxi comparison amount should use a real RMB symbol instead of a question mark');
assert.match(page, /note\.textContent = taxi\.deltaYear > 0[\s\S]*?\u6253\u8f66\u6bd4\u5f53\u524d\u517b\u8f66\u65b9\u6848\u591a\u82b1 ¥[\s\S]*?\u5e74/, 'taxi comparison card should use one short annual conclusion line with a real RMB symbol');
assert.doesNotMatch(page, /const mileageLead = d\.mileage > 0/, 'taxi comparison note should no longer repeat the mileage lead-in');
assert.doesNotMatch(page, /\?\s*\+\s*fmt\(taxi\.taxiYear\)/, 'taxi comparison amount should not keep the broken question-mark currency prefix');

console.log('taxi comparison contract passed');
