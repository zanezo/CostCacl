const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /id="imageCardBtn"/, 'page needs an image-card action');
assert.match(page, /id="imageCardBtn">(?:图片分享|&#22270;&#29255;&#20998;&#20139;)<\//, 'image-card action must use the new font-stable text label');
assert.match(page, /function createResultCard\(\)/, 'page must generate a shareable result card');
assert.match(page, /canvas\.width\s*=\s*1080/, 'card must use a phone-friendly 1080px width');
assert.match(page, /canvas\.height\s*=\s*1920/, 'card must use a phone-friendly 9:16 height');
assert.match(page, /getCostInsight\(d, r\)/, 'card must include the current cost insight');
assert.match(page, /getTaxiComparison\(d, r\)/, 'card should derive taxi comparison data for the share image');
assert.match(page, /打车参考|\\u6253\\u8f66\\u53c2\\u8003/, 'card should include a taxi comparison summary');
assert.match(page, /ctx\.arc\(/, 'card must draw a cost composition ring chart');
assert.match(page, /canvas\.toBlob\(/, 'card must export a PNG image');
assert.match(page, /imageCardBtn\.addEventListener\('click', createResultCard\)/, 'image-card action must be wired to its button');
assert.match(page, /简要结论|\\u7b80\\u8981\\u7ed3\\u8bba/, 'share text should include a concise result summary');
assert.match(page, /function drawCardParagraph[\s\S]*?ctx\.textAlign\s*=\s*'left'/, 'insight paragraph must reset canvas text alignment before drawing');

console.log('result card contract passed');
