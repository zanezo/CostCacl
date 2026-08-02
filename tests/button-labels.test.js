const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(
  page.includes('id="resetBtn">参数重置</button>') || page.includes('id="resetBtn">&#21442;&#25968;&#37325;&#32622;</button>'),
  'reset button should say 参数重置'
);
assert.ok(
  page.includes('id="imageCardBtn">图片分享</button>') || page.includes('id="imageCardBtn">&#22270;&#29255;&#20998;&#20139;</button>'),
  'image button should say 图片分享'
);
assert.ok(
  page.includes('id="shareBtn">文字分享</button>') || page.includes('id="shareBtn">&#25991;&#23383;&#20998;&#20139;</button>'),
  'share button should say 文字分享'
);
assert.ok(page.includes("reset.textContent='\\u53c2\\u6570\\u91cd\\u7f6e'"), 'desktop workspace should preserve 参数重置');
assert.ok(page.includes("imageCard.textContent='\\u56fe\\u7247\\u5206\\u4eab'"), 'desktop workspace should preserve 图片分享');
assert.ok(page.includes("share.textContent='\\u6587\\u5b57\\u5206\\u4eab'"), 'desktop workspace should preserve 文字分享');

console.log('button label contract passed');
