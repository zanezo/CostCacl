# Growth and Safety Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add abuse-resistant analytics protection, stronger social share previews, and a lightweight taxi-vs-car comparison without breaking the current single-page calculator layout.

**Architecture:** Keep the app as a static `index.html` plus Edge-style APIs, and layer the work in three slices: API protection, share-preview metadata/result copy, and UI-level taxi comparison. Reuse the existing parameterized share URL and tested taxi math, then add the smallest possible new data model and DOM surface.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, Edge fetch handlers, Upstash Redis REST API, Node.js contract tests with `assert`

---

## File Structure

- Modify: `D:\VC\CostCacl\index.html`
  - meta tags and share text
  - calculator input model and share URL parameters
  - taxi comparison card and taxi parameter group
  - result-card rendering text
- Modify: `D:\VC\CostCacl\admin.html`
  - second admin gate field and request headers
- Modify: `D:\VC\CostCacl\api\visit.js`
  - visit dedupe/rate limit
- Modify: `D:\VC\CostCacl\api\event.js`
  - event rate limit
- Modify: `D:\VC\CostCacl\api\stats.js`
  - second gate check in front of existing bearer token
- Modify: `D:\VC\CostCacl\tests\admin-dashboard.test.js`
  - assert the second gate layer
- Modify: `D:\VC\CostCacl\tests\event-analytics.test.js`
  - assert throttling support exists
- Modify: `D:\VC\CostCacl\tests\share-link-and-insights.test.js`
  - assert taxi params and richer share output
- Modify: `D:\VC\CostCacl\tests\result-card.test.js`
  - update image-share label and richer share-card copy
- Modify: `D:\VC\CostCacl\tests\taxi-budget.test.js`
  - lock reusable taxi math helper presence
- Create: `D:\VC\CostCacl\tests\share-preview-meta.test.js`
  - assert OG/Twitter/canonical metadata
- Create: `D:\VC\CostCacl\tests\rate-limit.test.js`
  - assert visit/event APIs use IP-aware throttling primitives

### Task 1: Lock and implement the analytics protection layer

**Files:**
- Create: `D:\VC\CostCacl\tests\rate-limit.test.js`
- Modify: `D:\VC\CostCacl\tests\admin-dashboard.test.js`
- Modify: `D:\VC\CostCacl\tests\event-analytics.test.js`
- Modify: `D:\VC\CostCacl\api\visit.js`
- Modify: `D:\VC\CostCacl\api\event.js`
- Modify: `D:\VC\CostCacl\api\stats.js`
- Modify: `D:\VC\CostCacl\admin.html`

- [ ] **Step 1: Write the failing protection tests**

Add a new rate-limit contract and extend existing dashboard/event contracts with these assertions:

```js
// tests/rate-limit.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const visitApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'visit.js'), 'utf8');
const eventApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'event.js'), 'utf8');

assert.match(visitApi, /cf-connecting-ip|x-forwarded-for|x-real-ip/i, 'visit API should derive a client IP');
assert.match(visitApi, /NX/, 'visit API should use Redis NX-style dedupe or throttling');
assert.match(eventApi, /cf-connecting-ip|x-forwarded-for|x-real-ip/i, 'event API should derive a client IP');
assert.match(eventApi, /throttle|limit|429|duplicate|cooldown/i, 'event API should expose throttling behavior');

console.log('rate limit contract passed');
```

```js
// tests/admin-dashboard.test.js (new assertions)
assert.match(dashboard, /id="accessGate"/, 'dashboard should request a second access gate value');
assert.match(dashboard, /X-Analytics-Gate/, 'dashboard should send the second gate header');
assert.match(api, /ANALYTICS_GATE_TOKEN/, 'stats API should require the second gate secret');
```

```js
// tests/event-analytics.test.js (new assertions)
assert.match(api, /cf-connecting-ip|x-forwarded-for|x-real-ip/i, 'event API should inspect the client IP');
assert.match(api, /429|thrott/i, 'event API should rate-limit analytics traffic');
```

- [ ] **Step 2: Run the protection tests to verify they fail**

Run:

```bash
node .\tests\rate-limit.test.js
node .\tests\admin-dashboard.test.js
node .\tests\event-analytics.test.js
```

Expected: FAIL because none of the APIs currently derive a client IP, there is no second gate token, and no throttling response path exists yet.

- [ ] **Step 3: Implement minimal abuse protection and the second gate**

Update the APIs with:

- a shared `clientIp` extractor using `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip`
- a Redis-backed `SET ... EX ... NX` visit dedupe window in `api/visit.js`
- a Redis-backed IP/event throttle key in `api/event.js`
- a second secret in `api/stats.js`, for example `ANALYTICS_GATE_TOKEN`, checked via `X-Analytics-Gate`
- matching `admin.html` form field and request header plumbing

Use this shape in `api/stats.js`:

```js
const gateHeader = request.headers.get('X-Analytics-Gate') || '';
if (!(await timingSafeEqual(gateHeader, process.env.ANALYTICS_GATE_TOKEN))) {
  return response({ error: 'Forbidden' }, 403);
}
```

Keep the existing bearer-token check after the gate check so both layers remain active.

- [ ] **Step 4: Run the protection tests to verify they pass**

Run:

```bash
node .\tests\rate-limit.test.js
node .\tests\admin-dashboard.test.js
node .\tests\event-analytics.test.js
node .\tests\edge-api-runtime.test.js
```

Expected:

- `rate limit contract passed`
- `admin dashboard contract passed`
- `event analytics contract passed`
- `edge API runtime contract passed`

- [ ] **Step 5: Commit the protection slice**

```bash
git add api/visit.js api/event.js api/stats.js admin.html tests/rate-limit.test.js tests/admin-dashboard.test.js tests/event-analytics.test.js
git commit -m "feat: harden analytics access and throttling"
```

### Task 2: Strengthen site/share previews without adding heavy dynamic OG logic

**Files:**
- Create: `D:\VC\CostCacl\tests\share-preview-meta.test.js`
- Modify: `D:\VC\CostCacl\tests\share-link-and-insights.test.js`
- Modify: `D:\VC\CostCacl\tests\result-card.test.js`
- Modify: `D:\VC\CostCacl\index.html`

- [ ] **Step 1: Write the failing share-preview tests**

Add metadata and share-copy assertions:

```js
// tests/share-preview-meta.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(page, /property="og:title"/, 'page should expose og:title');
assert.match(page, /property="og:description"/, 'page should expose og:description');
assert.match(page, /property="og:image"/, 'page should expose og:image');
assert.match(page, /name="twitter:card"/, 'page should expose twitter:card');
assert.match(page, /rel="canonical"/, 'page should expose a canonical URL');

console.log('share preview meta contract passed');
```

```js
// tests/share-link-and-insights.test.js (new assertions)
assert.match(page, /taxiStartFare/, 'share URL should include taxi start fare');
assert.match(page, /averageTripKm/, 'share URL should include average trip distance');
assert.match(page, /打车|出租车|网约车/, 'share text should mention the taxi comparison when available');
```

```js
// tests/result-card.test.js (update label + copy expectation)
assert.match(page, /id="imageCardBtn">(?:图片分享|&#22270;&#29255;&#20998;&#20139;)<\//, 'image-card action should use the new label');
assert.match(page, /打车|出租车|网约车/, 'share card flow should be able to mention the taxi comparison');
```

- [ ] **Step 2: Run the preview tests to verify they fail**

Run:

```bash
node .\tests\share-preview-meta.test.js
node .\tests\share-link-and-insights.test.js
node .\tests\result-card.test.js
```

Expected: FAIL because the page does not yet expose OG/Twitter/canonical metadata and the share flow currently knows nothing about taxi parameters.

- [ ] **Step 3: Implement metadata and lightweight result-feel share enhancements**

Update `index.html` to:

- add `og:*`, `twitter:*`, and `canonical` tags
- choose a stable share image path already available in the project or a newly added static preview asset
- extend `SHARE_PARAM_KEYS`, `SHARE_INPUT_IDS`, and `SHARE_DEFAULTS` with taxi settings
- update `shareResult()` text so it includes a short taxi comparison line when taxi math is available
- update result-card copy so the exported image remains consistent with the richer sharing story

- [ ] **Step 4: Run the preview regressions**

Run:

```bash
node .\tests\share-preview-meta.test.js
node .\tests\share-link-and-insights.test.js
node .\tests\result-card.test.js
node .\tests\button-labels.test.js
```

Expected:

- `share preview meta contract passed`
- `share link and insights contract passed`
- `result card contract passed`
- `button label contract passed`

- [ ] **Step 5: Commit the preview slice**

```bash
git add index.html tests/share-preview-meta.test.js tests/share-link-and-insights.test.js tests/result-card.test.js
git commit -m "feat: improve share previews and share copy"
```

### Task 3: Add a lightweight taxi comparison card and parameter group

**Files:**
- Modify: `D:\VC\CostCacl\index.html`
- Modify: `D:\VC\CostCacl\tests\taxi-budget.test.js`
- Modify: `D:\VC\CostCacl\tests\desktop-workspace.test.js`

- [ ] **Step 1: Write the failing taxi UI tests**

Extend the taxi math contract and add layout assertions:

```js
// tests/taxi-budget.test.js (new assertions)
const page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(page, /function getTaxiComparison\(/, 'page should expose a reusable taxi comparison helper');
assert.match(page, /taxiStartFare/, 'page should expose taxi input fields');
assert.match(page, /breakEvenMileage/, 'page should render the taxi break-even output');
```

```js
// tests/desktop-workspace.test.js (new assertion)
assert.match(page, /taxi-card|taxiComparison/, 'desktop workspace should include a taxi comparison panel in the analysis column');
```

- [ ] **Step 2: Run the taxi tests to verify they fail**

Run:

```bash
node .\tests\taxi-budget.test.js
node .\tests\desktop-workspace.test.js
```

Expected: FAIL because the current UI has no taxi parameter group and no taxi comparison card.

- [ ] **Step 3: Implement the light taxi comparison UI**

In `index.html`:

- add a new collapsed parameter group after current usage costs
- add four inputs: `taxiStartFare`, `taxiStartKm`, `taxiPerKm`, `averageTripKm`
- add a helper such as `getTaxiComparison(d, r)` returning:
  - `singleTripCost`
  - `taxiCostPerKm`
  - `annualTaxiCost`
  - `annualDifference`
  - `breakEvenMileage`
  - `isTaxiCheaper`
- add a lightweight taxi comparison card below the main result hero and above the chart
- wire the card into `render()` so the comparison updates with every parameter change

- [ ] **Step 4: Run the taxi and layout regressions**

Run:

```bash
node .\tests\taxi-budget.test.js
node .\tests\desktop-workspace.test.js
node .\tests\footer.test.js
node .\tests\share-link-and-insights.test.js
```

Expected:

- `taxi budget calculations passed`
- `desktop workspace layout contract passed`
- `footer contract passed`
- `share link and insights contract passed`

- [ ] **Step 5: Commit the taxi slice**

```bash
git add index.html tests/taxi-budget.test.js tests/desktop-workspace.test.js
git commit -m "feat: add taxi comparison insights"
```
