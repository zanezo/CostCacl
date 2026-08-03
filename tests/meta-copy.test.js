const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /<meta property="og:title" content="(?:\u8f66\u8f86\u6210\u672c\u8ba1\u7b97\u5668|&#36710;&#36742;&#25104;&#26412;&#35745;&#31639;&#22120;)">/, 'og:title should use readable Chinese copy');
assert.match(page, /<meta property="og:description" content="(?:\u8ba1\u7b97\u8f66\u8f86\u6bcf\u5468\/\u6bcf\u5e74\u7684\u6301\u6709\u548c\u51fa\u884c\u6210\u672c|&#35745;&#31639;&#36710;&#36742;&#27599;&#21608;\/&#27599;&#24180;&#30340;&#25345;&#26377;&#21644;&#20986;&#34892;&#25104;&#26412;)">/, 'og:description should use readable Chinese copy');
assert.match(page, /<meta property="og:image:alt" content="(?:\u8f66\u8f86\u6210\u672c\u8ba1\u7b97\u5668|&#36710;&#36742;&#25104;&#26412;&#35745;&#31639;&#22120;)">/, 'og:image:alt should use readable Chinese copy');
assert.match(page, /<meta name="twitter:title" content="(?:\u8f66\u8f86\u6210\u672c\u8ba1\u7b97\u5668|&#36710;&#36742;&#25104;&#26412;&#35745;&#31639;&#22120;)">/, 'twitter:title should use readable Chinese copy');
assert.match(page, /<meta name="twitter:description" content="(?:\u8ba1\u7b97\u8f66\u8f86\u6bcf\u5468\/\u6bcf\u5e74\u7684\u6301\u6709\u548c\u51fa\u884c\u6210\u672c|&#35745;&#31639;&#36710;&#36742;&#27599;&#21608;\/&#27599;&#24180;&#30340;&#25345;&#26377;&#21644;&#20986;&#34892;&#25104;&#26412;)">/, 'twitter:description should use readable Chinese copy');
assert.match(page, /<title>(?:\u8f66\u8f86\u6210\u672c\u8ba1\u7b97\u5668|&#36710;&#36742;&#25104;&#26412;&#35745;&#31639;&#22120;)<\/title>/, 'page title should use readable Chinese copy');

console.log('meta copy contract passed');
