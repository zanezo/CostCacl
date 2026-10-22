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
      await page.locator('#personalSave').click();
      await page.waitForTimeout(100);
      for (const name of ['calculation_completed', 'result_card_generated', 'result_saved']) {
        assert.ok(events.some(e => e.event === name), `${width}: missing ${name}`);
      }
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
    await admin.route('**/api/stats', route => route.fulfill({json: {
      metrics: {page_view: 20, result_saved: 3}, conversion: {calculationRate: 0.5},
      daily: [{day: '2026-10-22', page_view: 20, calculation_completed: 10, result_card_generated: 4, result_saved: 3, result_shared: 1}],
      updatedAt: '2026-10-22T08:00:00Z'
    }}));
    await admin.goto(`http://127.0.0.1:${server.address().port}/admin.html`);
    await admin.locator('#accessGate').fill('test');
    await admin.locator('#accessToken').fill('test');
    await admin.locator('#accessForm button').click();
    await admin.locator('#dashboard').waitFor({state: 'visible'});
    assert.equal(await admin.locator('[data-metric="page_view"]').textContent(), '20');
    assert.equal(await admin.locator('[data-metric="result_saved"]').textContent(), '3');
    assert.equal(await admin.locator('#dailyRows tr').count(), 1);
    assert.equal(await admin.locator('[data-conversion="calculationRate"]').textContent(), '50.0%');
    await admin.close();
    console.log('analytics browser: mobile/desktop events and admin trends passed');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
