# Footer Softening + Share Label Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the three action labels and turn the current strong footer card into a lightweight end-of-page cue that still preserves GitHub and feedback links.

**Architecture:** Keep the app as a single-file HTML/CSS/JS page, but tighten responsibilities through tests: one test locks button copy, another locks the softer footer contract. Implementation stays in `index.html`, with no new runtime dependencies and no behavior changes beyond visible copy and lighter footer structure.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node.js contract tests with `assert`

---

## File Structure

- Modify: `D:\VC\CostCacl\index.html`
  - Footer bar button labels near `#resetBtn`, `#imageCardBtn`, `#shareBtn`
  - Desktop workspace remount script near `mountDesktopWorkspace()`
  - Footer CSS block near `.site-footer`
  - Footer HTML block near `<footer class="site-footer">`
  - Analytics selector near `.footer-link[href*="/issues"]`
- Modify: `D:\VC\CostCacl\tests\footer.test.js`
  - Replace the old “footer card” assumptions with a lightweight end-of-page contract
- Create: `D:\VC\CostCacl\tests\button-labels.test.js`
  - Lock the new visible action labels and the desktop text override

### Task 1: Lock and implement the new action labels

**Files:**
- Create: `D:\VC\CostCacl\tests\button-labels.test.js`
- Modify: `D:\VC\CostCacl\index.html`
- Test: `D:\VC\CostCacl\tests\button-labels.test.js`

- [ ] **Step 1: Write the failing label contract test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /id="resetBtn">参数重置<\/button>/, 'reset button should say 参数重置');
assert.match(page, /id="imageCardBtn">(?:图片分享|&#22270;&#29255;&#20998;&#20139;)<\/button>/, 'image button should say 图片分享');
assert.match(page, /id="shareBtn">文字分享<\/button>/, 'share button should say 文字分享');
assert.match(page, /reset\.textContent='参数重置'/, 'desktop workspace should preserve 参数重置');
assert.match(page, /imageCard\.textContent='图片分享'/, 'desktop workspace should preserve 图片分享');
assert.match(page, /share\.textContent='文字分享'/, 'desktop workspace should preserve 文字分享');

console.log('button label contract passed');
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node .\tests\button-labels.test.js`
Expected: FAIL because `index.html` still contains `重置`, `生成图片`, `分享结果`, and the desktop remount script still overrides at least `share.textContent` with the old wording.

- [ ] **Step 3: Update the visible labels and the desktop remount override**

Replace the footer-bar buttons and the desktop text overrides in `D:\VC\CostCacl\index.html` with:

```html
<div class="footer-bar">
  <div class="inner">
    <button class="btn btn-secondary" id="resetBtn">参数重置</button>
    <button class="btn btn-secondary" id="imageCardBtn">图片分享</button>
    <button class="btn btn-primary" id="shareBtn">文字分享</button>
  </div>
</div>
```

```js
const toolbar=document.createElement('header'); toolbar.className='desktop-toolbar';
const actions=document.createElement('div'); actions.className='desktop-actions'; actions.append(reset,imageCard,share);
const workspace=document.createElement('main'); workspace.className='desktop-workspace';
const parameters=document.createElement('section'); parameters.className='desktop-parameters card'; parameters.innerHTML='<h2 class="desktop-panel-title">参数配置</h2>';
const analysis=document.createElement('section'); analysis.className='desktop-analysis';
const breakdown=document.createElement('aside'); breakdown.className='desktop-breakdown';
toolbar.append(nav,typeCard,actions);
reset.textContent='参数重置';
imageCard.textContent='图片分享';
share.textContent='文字分享';
```

- [ ] **Step 4: Run the label test to verify it passes**

Run: `node .\tests\button-labels.test.js`
Expected: `button label contract passed`

- [ ] **Step 5: Commit the label-only checkpoint**

```bash
git add index.html tests/button-labels.test.js
git commit -m "feat: refresh share action labels"
```

### Task 2: Convert the footer from a feature card into a soft end-of-page cue

**Files:**
- Modify: `D:\VC\CostCacl\index.html`
- Modify: `D:\VC\CostCacl\tests\footer.test.js`
- Test: `D:\VC\CostCacl\tests\footer.test.js`

- [ ] **Step 1: Rewrite the footer contract around the new A2 structure**

Replace `D:\VC\CostCacl\tests\footer.test.js` with a contract that checks for the lighter structure instead of the old three-column card:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /<footer class="site-footer"/, 'site footer should exist');
assert.match(page, /class="footer-end"/, 'footer should expose an end-of-page cue');
assert.match(page, /本页内容到这里结束|&#26412;&#39029;&#20869;&#23481;&#21040;&#36825;&#37324;&#32467;&#26463;/, 'footer should explicitly say the page ends here');
assert.match(page, /如需继续对比，可回到上方调整参数|&#22914;&#38656;&#32487;&#32493;&#23545;&#27604;&#65292;&#21487;&#22238;&#21040;&#19978;&#26041;&#35843;&#25972;&#21442;&#25968;/, 'footer should point users back upward instead of acting like a feature card');
assert.match(page, /https:\/\/github\.com\/zanezo\/CostCacl/, 'footer should still link to the repository');
assert.match(page, /https:\/\/github\.com\/zanezo\/CostCacl\/issues/, 'footer should still link to feedback');
assert.match(page, /\.site-footer\s*\{[^}]*width:\s*min\(calc\(100%\s*-\s*48px\),\s*1480px\)/, 'desktop footer should still align with the main workspace width');
assert.match(page, /\.site-footer\s*\{[^}]*background:\s*transparent/, 'footer should drop the white card background');
assert.doesNotMatch(page, /\.footer-link\s*\{[^}]*background:\s*#f3f8ff/i, 'footer links should no longer look like pill buttons');
assert.match(page, /@media\s*\(max-width:\s*680px\)[\s\S]*?\.site-footer/, 'footer should still adapt to phones');

console.log('footer contract passed');
```

- [ ] **Step 2: Run the footer contract to verify it fails**

Run: `node .\tests\footer.test.js`
Expected: FAIL because the current footer still uses the white card, three-column content block, and pill-style `.footer-link` buttons.

- [ ] **Step 3: Replace the footer CSS, HTML, and feedback selector with the softer A2 design**

Update the `D:\VC\CostCacl\index.html` footer styles to a lightweight end-cap. Use this structure as the target:

```css
.site-footer {
  width: min(calc(100% - 48px), 1480px);
  margin: 20px auto 36px;
  padding: 28px 0 0;
  background: transparent;
  border: 0;
  border-top: 1px solid #e2e7f0;
  border-radius: 0;
  color: #718097;
}
.footer-end {
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
}
.footer-end-title {
  margin: 0;
  color: #5c6778;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .02em;
}
.footer-end-copy,
.footer-meta {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #8d98aa;
}
.footer-deeper {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
}
.footer-link {
  color: #6f86a6;
  text-decoration: none;
}
.footer-link:hover {
  color: #3e6fb0;
  text-decoration: underline;
}
@media (max-width: 680px) {
  .site-footer {
    width: calc(100% - 28px);
    margin: 18px auto 28px;
    padding-top: 22px;
  }
  .footer-end-title { font-size: 14px; }
  .footer-end-copy,
  .footer-meta,
  .footer-deeper { font-size: 12px; }
}
```

Replace the current footer markup with:

```html
<footer class="site-footer" aria-label="站点信息">
  <div class="footer-end">
    <p class="footer-end-title">本页内容到这里结束</p>
    <p class="footer-end-copy">如需继续对比，可回到上方调整参数。</p>
    <p class="footer-deeper">
      <span>继续了解：</span>
      <a class="footer-link" href="https://github.com/zanezo/CostCacl" target="_blank" rel="noreferrer">项目源码</a>
      <span aria-hidden="true">/</span>
      <a class="footer-link" href="https://github.com/zanezo/CostCacl/issues" target="_blank" rel="noreferrer">提交反馈</a>
    </p>
    <p class="footer-meta">© 2026 cost.ahopig.com · 结果仅供估算，不构成购车、投资或理财建议。</p>
  </div>
</footer>
```

Keep the analytics click hook compatible by updating the selector block to:

```js
const link = event.target.closest('a');
if (link && link.matches('.footer-link[href*="/issues"]')) {
  sendAnalyticsEvent('feedback_clicked');
}
```

If the selector already matches this shape, leave the logic untouched.

- [ ] **Step 4: Run the direct regression checks**

Run:

```bash
node .\tests\button-labels.test.js
node .\tests\footer.test.js
node .\tests\share-link-and-insights.test.js
npm run build
```

Expected:
- `button label contract passed`
- `footer contract passed`
- `share link and insights contract passed`
- build completes successfully

- [ ] **Step 5: Commit the footer redesign checkpoint**

```bash
git add index.html tests/footer.test.js tests/button-labels.test.js
git commit -m "feat: soften footer ending cue"
```
