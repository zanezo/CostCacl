const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const file = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless: true});
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({viewport: {width, height: 850}});
      await page.addInitScript(() => {
        navigator.canShare = () => true;
        navigator.share = async () => { throw new DOMException('Cancelled', 'AbortError'); };
      });
      const events = [];
      await page.route('**/api/**', async route => {
        if (route.request().url().includes('/api/event')) events.push(route.request().postDataJSON());
        await route.fulfill({json: {ok: true, count: 1}});
      });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(() => document.documentElement.dataset.calculatorReady === 'true');
      assert.ok(events.some(e => e.event === 'page_view' && e.version === 2));
      assert.ok(!events.some(e => e.event === 'calculation_completed'), 'initial defaults are not an active calculation');
      if (width < 960) {
        await page.locator('.mobile-calculate').evaluate(button => button.click());
        await page.waitForTimeout(100);
        assert.ok(events.some(e => e.event === 'calculation_completed'));
      } else {
        const input = page.locator('.wrap input[type="number"]').first();
        await input.fill(String(Number(await input.inputValue()) + 1));
        await page.waitForTimeout(1000);
        assert.ok(events.some(e => e.event === 'calculation_completed'), 'desktop parameter editing should count');
      }
      await page.evaluate(() => PersonalCarShare.open());
      await page.waitForFunction(() => !document.querySelector('#personalSave').disabled);
      assert.equal(await page.locator('.visitor-name').count(), 0, 'nickname entry should only appear in card preview');
      const visitorBefore = await page.evaluate(() => VisitorProfile.id);
      assert.ok((await page.locator('#cardNickname').inputValue()).length > 0);
      await page.locator('#cardNickname').fill('长'.repeat(17));
      await page.locator('.personal-nickname button').click();
      assert.ok((await page.locator('#cardNicknameHint').textContent()).includes('1～16'));
      await page.locator('#cardNickname').fill('今天也是快乐车主');
      await page.locator('.personal-nickname button').click();
      await page.waitForFunction(() => !document.querySelector('#personalSave').disabled);
      assert.equal(await page.evaluate(() => VisitorProfile.id), visitorBefore);
      assert.equal(await page.evaluate(() => localStorage.getItem('costcalc:nickname')), '今天也是快乐车主');
      assert.equal(await page.locator('.personal-nickname').evaluate(el => el.scrollWidth <= el.clientWidth), true, 'nickname editor must fit the preview');
      if (width === 390) {
        await page.locator('#personalShareDialog').evaluate(el => { el.scrollTop = 0; });
        await page.screenshot({path: path.join(require('node:os').tmpdir(), 'costcalc-nickname-mobile.png')});
        await page.locator('#personalCardCanvas').evaluate(canvas => { window.cardData = canvas.toDataURL(); });
        fs.writeFileSync(path.join(require('node:os').tmpdir(), 'costcalc-nickname-card.png'), Buffer.from(await page.evaluate(() => window.cardData.split(',')[1]), 'base64'));
      }
      await page.locator('#personalSave').click();
      await page.waitForTimeout(100);
      for (const name of ['calculation_completed', 'result_card_generated', 'result_saved']) {
        assert.ok(events.some(e => e.event === name), `${width}: missing ${name}`);
      }
      assert.ok(events.some(e => e.event === 'result_card_generated' && e.nickname === '今天也是快乐车主'));
      assert.ok(!events.some(e => e.event === 'result_shared'), 'download must not count as sharing');
      await page.locator('#personalNativeShare').click();
      await page.waitForTimeout(100);
      assert.ok(!events.some(e => e.event === 'result_shared'), 'cancelled sharing must not count');
      await page.evaluate(() => { navigator.share = async () => {}; });
      await page.locator('#personalNativeShare').click();
      await page.waitForTimeout(100);
      assert.ok(events.some(e => e.event === 'result_shared'), 'resolved native sharing must count');
      await page.close();
    }
    const admin = await browser.newPage({viewport: {width: 390, height: 850}});
    await admin.route('https://cost.test/**', route => {
      const file = new URL(route.request().url()).pathname;
      return route.fulfill({contentType:'text/html', body: fs.readFileSync(path.join(root, file), 'utf8')});
    });
    let loggedIn = false;
    await admin.route('https://challenges.cloudflare.com/**', route => route.fulfill({contentType: 'text/javascript', body: `window.turnstile={render:(id, options)=>{window.challengeOptions=options;setTimeout(()=>options.callback('test-token'),0);return 'widget';},reset:()=>{setTimeout(()=>window.challengeOptions.callback('new-token'),0);}};window.onAnalyticsTurnstileLoad();`}));
    await admin.route('**/api/stats**', route => {
      const request = route.request();
      if (request.url().includes('?config=1')) return route.fulfill({json: {siteKey: 'test-key'}});
      if (request.method() === 'POST') {
        assert.equal(request.postDataJSON().token, 'test-token');
        assert.equal(request.postDataJSON().password, 'test');
        loggedIn = true;
        return route.fulfill({headers: {'Set-Cookie': '__Secure-costcalc_admin=' + 'a'.repeat(64) + '; Path=/api/stats; HttpOnly; Secure; SameSite=Strict; Max-Age=3600'}, json: {ok: true}});
      }
      if (request.method() === 'DELETE') { loggedIn = false; return route.fulfill({json: {ok: true}}); }
      if (!loggedIn) return route.fulfill({status: 401, json: {error: 'Unauthorized'}});
      assert.ok(request.headers().cookie?.includes('__Secure-costcalc_admin='), 'browser must send the protected session cookie');
      return route.fulfill({json: {
      metrics: {page_view: 20, result_saved: 3}, conversion: {calculationRate: 0.5},
      daily: [{day: '2026-10-22', page_view: 20, calculation_completed: 10, result_card_generated: 4, result_saved: 3, result_shared: 1}],
      visitors: [{id:'browser-1234567890', nickname:'<img src=x onerror=alert(1)>', lastSeen:Date.now(), counts:{result_card_generated:2,result_saved:1}}],
      updatedAt: '2026-10-22T08:00:00Z'
      }});
    });
    await admin.goto('https://cost.test/admin.html');
    assert.equal(await admin.locator('input[type="password"]').count(), 1);
    await admin.locator('#accessToken').fill('test');
    await admin.locator('#accessForm [type="submit"]').click();
    await admin.locator('#dashboard').waitFor({state: 'visible'});
    assert.equal(await admin.locator('[data-metric="page_view"]').textContent(), '20');
    assert.equal(await admin.locator('[data-metric="result_saved"]').textContent(), '3');
    assert.equal(await admin.locator('#dailyRows tr').count(), 1);
    assert.equal(await admin.locator('#visitorRows tr').count(), 1);
    assert.equal(await admin.locator('#visitorRows img').count(), 0, 'nicknames must be rendered as text');
    assert.equal(await admin.locator('[data-conversion="calculationRate"]').textContent(), '50.0%');
    await admin.locator('#refreshButton').click();
    await admin.locator('#logoutButton').click();
    await admin.locator('#accessPanel').waitFor({state: 'visible'});
    assert.equal(loggedIn, false);
    await admin.close();
    const failing = await browser.newPage({viewport: {width: 390, height: 850}});
    await failing.route('**/api/stats**', route => route.fulfill({status: route.request().url().includes('?config=1') ? 503 : 401, json: {code: 'verification_unconfigured'}}));
    await failing.goto(`http://127.0.0.1:${server.address().port}/admin.html`);
    await failing.waitForFunction(() => document.querySelector('#formError').textContent.includes('尚未配置'));
    assert.equal(await failing.locator('[type="submit"]').isDisabled(), true);
    assert.equal(await failing.locator('#verificationRetry').isVisible(), true);
    await failing.close();
    const restored = await browser.newPage();
    await restored.route('https://challenges.cloudflare.com/**', route => route.abort());
    await restored.route('**/api/stats**', route => route.fulfill({json: route.request().url().includes('?config=1') ? {siteKey:'test'} : {metrics:{page_view:5},conversion:{},daily:[],updatedAt:new Date().toISOString()}}));
    await restored.goto(`http://127.0.0.1:${server.address().port}/admin.html`);
    await restored.locator('#dashboard').waitFor({state:'visible'});
    assert.equal(await restored.locator('[data-metric="page_view"]').textContent(), '5');
    await restored.close();
    console.log('analytics browser: mobile/desktop events and admin trends passed');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
